fn stage_profile_call(db:&Path,path:&Path,retained:Option<&Connection>,now:i64)->serde_json::Value {
    watch_phase_probe::begin();
    let result=if let Some(conn)=retained {
        record_watch_path_change(conn,"folder-1",path,now)
    }else{
        let conn=Connection::open(db).unwrap();watch_phase_probe::mark("connection_open");
        crate::local_db::configure_connection(&conn);watch_phase_probe::mark("connection_config");
        let result=record_watch_path_change(&conn,"folder-1",path,now);
        drop(conn);watch_phase_probe::mark("connection_close");result
    };
    let (total,parts)=watch_phase_probe::finish();assert_eq!(result.unwrap(),1);
    let mut phases=std::collections::BTreeMap::<&str,u64>::new();
    for (label,ns) in parts{*phases.entry(label).or_default()+=ns;}
    json!({"totalNs":total,"phasesNs":phases})
}

fn stage_profile_save(path:&Path,sequence:i64) {
    use std::io::{Seek,SeekFrom,Write};
    let mut file=std::fs::OpenOptions::new().write(true).open(path).unwrap();
    file.seek(SeekFrom::End(-16)).unwrap();write!(file,"{sequence:016}").unwrap();
}

#[test]
fn stage_profile_covers_actual_storage_and_write_wait() {
    use std::{sync::{Arc,Barrier},time::Duration};
    let f=WatchConnectionFixture::new();let path=f.ready_file("profile.bin");
    std::fs::write(&path,vec![b'x';1024]).unwrap();
    let barrier=Arc::new(Barrier::new(2));let worker_barrier=barrier.clone();let db=f.db.clone();
    let writer=std::thread::spawn(move||{
        let mut c=Connection::open(db).unwrap();crate::local_db::configure_connection(&c);
        let tx=c.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate).unwrap();
        worker_barrier.wait();std::thread::sleep(Duration::from_millis(100));tx.commit().unwrap();
    });
    barrier.wait();let row=stage_profile_call(&f.db,&path,Some(f.conn()),10);writer.join().unwrap();
    let phases=row["phasesNs"].as_object().unwrap();
    for name in ["metadata","hash","write_wait","db_lookup","file_metadata_write","search_extract","search_write","event_write","merge","savepoint_release","commit"]{assert!(phases.contains_key(name),"missing {name}");}
    assert!(phases["write_wait"].as_u64().unwrap()>30_000_000);
    assert_eq!(phases.values().map(|v|v.as_u64().unwrap()).sum::<u64>(),row["totalNs"].as_u64().unwrap());
}

#[test]
#[ignore="explicit paired actual-code phase measurement"]
fn watch_stage_profile_benchmark() {
    let output=PathBuf::from(std::env::var_os("BUBLI_PROFILE_OUTPUT").expect("fresh output file"));assert!(!output.exists());
    let reverse=std::env::var("BUBLI_PROFILE_REVERSE").is_ok_and(|v|v=="1");
    let settle=std::env::var("BUBLI_PROFILE_SETTLE_MS").unwrap_or_else(|_|"0".into()).parse::<u64>().unwrap();
    let mut rows=Vec::new();let mut starts=Vec::new();
    for (case,size) in [("text_1KiB",1024),("binary_30MiB",30*1024*1024)] {
        let fixtures=[WatchConnectionFixture::new(),WatchConnectionFixture::new()];
        let paths=fixtures.each_ref().map(|f|f.ready_file(if size==1024{"profile.txt"}else{"profile.bin"}));
        for path in &paths{std::fs::write(path,vec![b'x';size]).unwrap();}
        watch_phase_probe::begin();let retained=open_managed_folder_watch_connection(&fixtures[1].db).unwrap();
        let (ns,parts)=watch_phase_probe::finish();starts.push(json!({"case":case,"totalNs":ns,"phases":parts}));
        let mut sequences=[10_i64,10_i64];
        for _ in 0..4{for mode in [0,1]{
            sequences[mode]+=1;stage_profile_save(&paths[mode],sequences[mode]);
            stage_profile_call(&fixtures[mode].db,&paths[mode],(mode==1).then_some(&retained),sequences[mode]);
        }}
        for block in 0..30 {
            let order=if (block%2==0)^reverse {[0,1,1,0]}else{[1,0,0,1]};
            for (position,mode) in order.into_iter().enumerate(){
                sequences[mode]+=1;stage_profile_save(&paths[mode],sequences[mode]);
                if settle>0{std::thread::sleep(std::time::Duration::from_millis(settle));}
                let mut row=stage_profile_call(&fixtures[mode].db,&paths[mode],(mode==1).then_some(&retained),sequences[mode]);
                row["case"]=json!(case);row["mode"]=json!(if mode==0{"reopen"}else{"retain"});row["block"]=json!(block);row["position"]=json!(position);
                let wal=PathBuf::from(format!("{}-wal",fixtures[mode].db.display()));row["walBytes"]=json!(std::fs::metadata(wal).map(|m|m.len()).unwrap_or(0));rows.push(row);
            }
        }
        for (index,f) in fixtures.iter().enumerate(){
            let actual:String=f.conn().query_row("SELECT checksum FROM local_files",[],|r|r.get(0)).unwrap();assert_eq!(actual,sha256_file(&paths[index]).unwrap());
            assert_eq!(f.conn().query_row("SELECT COUNT(*) FROM local_file_events WHERE status='PENDING'",[],|r|r.get::<_,i64>(0)).unwrap(),1);
            assert_eq!(f.conn().query_row("PRAGMA integrity_check",[],|r|r.get::<_,String>(0)).unwrap(),"ok");
        }
        drop(retained);
    }
    std::fs::write(output,serde_json::to_vec_pretty(&json!({"reverse":reverse,"settleMs":settle,"sqlite":rusqlite::version(),"starts":starts,"rows":rows})).unwrap()).unwrap();
}

fn hash_with_buffer<const N:usize>(path:&Path)->String {
    let mut file=File::open(path).unwrap();let mut digest=Sha256::new();let mut buffer=[0_u8;N];
    loop{let count=file.read(&mut buffer).unwrap();if count==0{break;}digest.update(&buffer[..count]);}
    format!("{:x}",digest.finalize())
}

#[test]
fn hash_buffer_candidates_preserve_full_file_digest() {
    let f=WatchConnectionFixture::new();let path=f.folder.join("hash.bin");
    for size in [0,3,8191,8192,8193,65535,65536,65537,1024*1024+17]{
        let content:Vec<u8>=(0..size).map(|i|((i*17+3)%251) as u8).collect();std::fs::write(&path,&content).unwrap();
        let expected=format!("{:x}",Sha256::digest(&content));
        for actual in [sha256_file(&path).unwrap(),hash_with_buffer::<8192>(&path),hash_with_buffer::<65536>(&path),hash_with_buffer::<262144>(&path),hash_with_buffer::<1048576>(&path)]{assert_eq!(actual,expected);}
    }
}

#[test]
#[ignore="explicit Criterion hash buffer comparison"]
fn hash_buffer_criterion_benchmark() {
    use criterion::{Criterion,SamplingMode};use std::time::Duration;
    let output=PathBuf::from(std::env::var_os("BUBLI_BENCH_OUTPUT").unwrap());assert!(!output.exists());
    let f=WatchConnectionFixture::new();let path=f.folder.join("hash.bin");std::fs::write(&path,vec![b'x';30*1024*1024]).unwrap();
    let expected=sha256_file(&path).unwrap();
    let mut cases:[(&str,fn(&Path)->String);4]=[("8KiB",hash_with_buffer::<8192>),("64KiB",hash_with_buffer::<65536>),("256KiB",hash_with_buffer::<262144>),("1MiB",hash_with_buffer::<1048576>)];
    if std::env::var("BUBLI_HASH_REVERSE").is_ok_and(|v|v=="1"){cases.reverse();}
    let mut c=Criterion::default().sample_size(30).warm_up_time(Duration::from_millis(500)).measurement_time(Duration::from_secs(3)).output_directory(&output);
    let mut group=c.benchmark_group("hash_30MiB");group.sampling_mode(SamplingMode::Flat);
    for (name,hash) in cases {assert_eq!(hash(&path),expected);group.bench_function(name,|b|b.iter(||std::hint::black_box(hash(&path))));}
    group.finish();c.final_summary();
}
