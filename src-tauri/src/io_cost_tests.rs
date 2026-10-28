fn io_cost_wal(conn:&Connection)->(i64,i64,i64){
    conn.query_row("PRAGMA wal_checkpoint(NOOP)",[],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).unwrap()
}

#[test]
fn io_cost_noop_checkpoint_observes_without_advancing(){
    let f=WatchConnectionFixture::new();let path=f.ready_file("noop.txt");std::fs::write(&path,"updated for WAL inspection").unwrap();
    record_watch_path_change(f.conn(),"folder-1",&path,10).unwrap();let a=io_cost_wal(f.conn());let b=io_cost_wal(f.conn());assert_eq!(a,b);assert_eq!(a.0,0);assert!(a.1>=a.2);
    let sync:i64=f.conn().pragma_query_value(None,"synchronous",|r|r.get(0)).unwrap();assert_eq!(sync,2);
}

#[test]
#[ignore="actual file and DB, no wait, per-stage and WAL-frame measurement"]
fn io_cost_pipeline_benchmark(){
    let output=PathBuf::from(std::env::var_os("BUBLI_IO_OUTPUT").unwrap());assert!(!output.exists());
    let variant=std::env::var("BUBLI_IO_VARIANT").unwrap();let reverse=std::env::var("BUBLI_IO_REVERSE").is_ok_and(|v|v=="1");
    let ablation=std::env::var("BUBLI_IO_ABLATION").is_ok_and(|v|v=="1");let mut rows=Vec::new();let mut settings=Vec::new();
    for (case,name,size)in [("text_1KiB","cost.txt",1024),("binary_1KiB","cost.bin",1024),("binary_30MiB","large.bin",30*1048576)]{
        let f=WatchConnectionFixture::new();let path=f.ready_file(name);std::fs::write(&path,vec![b'x';size]).unwrap();let conn=open_managed_folder_watch_connection(&f.db).unwrap();
        let sync:i64=conn.pragma_query_value(None,"synchronous",|r|r.get(0)).unwrap();assert_eq!(sync,2);
        let auto:i64=conn.pragma_query_value(None,"wal_autocheckpoint",|r|r.get(0)).unwrap();assert_eq!(auto,1000);
        settings.push(json!({"case":case,"synchronous":sync,"walAutocheckpoint":auto,"pageSize":conn.pragma_query_value(None,"page_size",|r|r.get::<_,i64>(0)).unwrap()}));
        let mut sequence=100_i64;record_watch_path_change(&conn,"folder-1",&path,sequence).unwrap();
        for block in 0..40{
            let mut order=if ablation {let q=[[0,1,3,2],[1,2,0,3],[2,3,1,0],[3,0,2,1]][block%4].to_vec();let mut back=q.clone();back.reverse();[q,back].concat()}else{vec![4,4]};if reverse{order.reverse();}
            for(position,mode)in order.into_iter().enumerate(){
                sequence+=1;stage_profile_save(&path,sequence);let prior=io_cost_wal(&conn);let guard=if mode<4{Some(io_cost_probe::select(mode))}else{None};
                io_cost_probe::begin_opens();watch_phase_probe::begin();let result=record_watch_path_change(&conn,"folder-1",&path,sequence);
                let(total,parts)=watch_phase_probe::finish();let opens=io_cost_probe::finish_opens();drop(guard);assert_eq!(result.unwrap(),1);let next=io_cost_wal(&conn);
                let mut phases=std::collections::BTreeMap::<&str,u64>::new();for(label,ns)in parts{*phases.entry(label).or_default()+=ns;}
                let frames=if next.1>=prior.1{next.1-prior.1}else{next.1};
                rows.push(json!({"variant":variant,"case":case,"block":block,"position":position,"mode":mode,"totalNs":total,"phasesNs":phases,"contentOpenCalls":opens,"walBefore":prior,"walAfter":next,"walFramesAdded":frames}));
            }
        }
        let actual:String=f.conn().query_row("SELECT checksum FROM local_files",[],|r|r.get(0)).unwrap();assert_eq!(actual,sha256_file(&path).unwrap());
        assert_eq!(f.conn().query_row("SELECT COUNT(*) FROM local_file_events WHERE status='PENDING'",[],|r|r.get::<_,i64>(0)).unwrap(),1);
        assert_eq!(f.conn().query_row("PRAGMA integrity_check",[],|r|r.get::<_,String>(0)).unwrap(),"ok");drop(conn);
    }
    std::fs::write(output,serde_json::to_vec_pretty(&json!({"variant":variant,"reverse":reverse,"ablation":ablation,"settings":settings,"rows":rows})).unwrap()).unwrap();
}

#[test]
#[ignore="full pipeline with 1000 and 10000 other search-index rows"]
fn io_cost_populated_index_benchmark(){
    let output=PathBuf::from(std::env::var_os("BUBLI_IO_OUTPUT").unwrap());assert!(!output.exists());let mut rows=Vec::new();
    for others in [1000,10000]{for name in ["population.txt","population.bin"]{
        let f=WatchConnectionFixture::new();let path=f.ready_file(name);std::fs::write(&path,vec![b'x';1024]).unwrap();
        f.conn().execute_batch("BEGIN IMMEDIATE").unwrap();{
            let mut seed=f.conn().prepare("INSERT INTO local_file_fts(local_file_id,file_name,content,local_path) VALUES(?1,?2,'unrelated seeded content',?3)").unwrap();
            for i in 0..others{seed.execute(params![format!("seed-{i}"),format!("seed-{i}.txt"),format!("/seed/{i}")]).unwrap();}
        }f.conn().execute_batch("COMMIT").unwrap();let conn=open_managed_folder_watch_connection(&f.db).unwrap();
        for i in 0..40{
            stage_profile_save(&path,100+i);let prior=io_cost_wal(&conn);watch_phase_probe::begin();assert_eq!(record_watch_path_change(&conn,"folder-1",&path,100+i).unwrap(),1);let(total,parts)=watch_phase_probe::finish();let next=io_cost_wal(&conn);
            let mut phases=std::collections::BTreeMap::<&str,u64>::new();for(label,ns)in parts{*phases.entry(label).or_default()+=ns;}
            rows.push(json!({"others":others,"name":name,"iteration":i,"totalNs":total,"phasesNs":phases,"walBefore":prior,"walAfter":next}));
        }
        assert_eq!(f.conn().query_row("SELECT COUNT(*) FROM local_file_fts",[],|r|r.get::<_,i64>(0)).unwrap(),others+1);
        let mut seed_check=f.conn().prepare("SELECT local_file_id,file_name,content,local_path FROM local_file_fts").unwrap();
        let mut preserved=0;for row in seed_check.query_map([],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,r.get::<_,String>(3)?))).unwrap(){
            let(id,name,content,path)=row.unwrap();if let Some(i)=id.strip_prefix("seed-"){assert_eq!(name,format!("seed-{i}.txt"));assert_eq!(content,"unrelated seeded content");assert_eq!(path,format!("/seed/{i}"));preserved+=1;}
        }assert_eq!(preserved,others);drop(seed_check);
        assert_eq!(f.conn().query_row("SELECT checksum FROM local_files",[],|r|r.get::<_,String>(0)).unwrap(),sha256_file(&path).unwrap());
        assert_eq!(f.conn().query_row("PRAGMA integrity_check",[],|r|r.get::<_,String>(0)).unwrap(),"ok");drop(conn);
    }}
    std::fs::write(output,serde_json::to_vec_pretty(&json!({"rows":rows})).unwrap()).unwrap();
}
