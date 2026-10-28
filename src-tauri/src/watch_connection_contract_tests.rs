struct WatchConnectionFixture {root:PathBuf,folder:PathBuf,db:PathBuf,conn:Option<Connection>}
impl WatchConnectionFixture {
    fn new()->Self {
        let root=std::env::temp_dir().join(format!("bubli-watch-connection-{}",Uuid::new_v4()));
        let folder=root.join("files");std::fs::create_dir_all(&folder).unwrap();let db=root.join("test.sqlite");
        let conn=crate::local_db::test_database_with_production_schema(&db);
        conn.execute("INSERT INTO managed_folders(id,name,path,status,sync_enabled,created_at,updated_at) VALUES('folder-1','test',?1,'ACTIVE',1,1,1)",params![folder.to_string_lossy().to_string()]).unwrap();
        Self{root,folder,db,conn:Some(conn)}
    }
    fn conn(&self)->&Connection {self.conn.as_ref().unwrap()}
    fn ready_file(&self,name:&str)->PathBuf {
        let path=self.folder.join(name);std::fs::write(&path,"original").unwrap();
        record_watch_path_change(self.conn(),"folder-1",&path,1).unwrap();
        let event=contract_stage(self.conn(),2).events.remove(0);
        contract_mark(self.conn(),json!([{"localEventId":event.local_event_id,"resourceId":format!("resource-{name}"),"status":"SYNCED"}]),3).unwrap();
        path
    }
}
impl Drop for WatchConnectionFixture {
    fn drop(&mut self){
        self.conn.take();
        // Windows notify releases its directory handle asynchronously after drop.
        let start=std::time::Instant::now();
        loop {
            match std::fs::remove_dir_all(&self.root) {
                Ok(())=>break,
                Err(e) if e.raw_os_error()==Some(32) && start.elapsed()<std::time::Duration::from_secs(5)=>std::thread::sleep(std::time::Duration::from_millis(10)),
                Err(e)=>panic!("isolated fixture cleanup failed: {e}"),
            }
        }
    }
}

#[test]
fn watch_two_connections_preserve_all_successful_changes() {
    use std::sync::{Arc,Barrier};
    let f=WatchConnectionFixture::new();let paths=[f.ready_file("one.txt"),f.ready_file("two.txt")];
    let barrier=Arc::new(Barrier::new(2));let mut threads=Vec::new();
    for (index,path) in paths.into_iter().enumerate() {
        let db=f.db.clone();let barrier=barrier.clone();
        threads.push(std::thread::spawn(move||{
            let mut run=native_watch_runner(&db);let mut errors=Vec::new();barrier.wait();
            for i in 0..30 {
                std::fs::write(&path,format!("{index}-{i}-{}","x".repeat(8192))).unwrap();
                if let Err(e)=run(&path,100+i){errors.push(e);}
                std::thread::yield_now();
            }
            errors
        }));
    }
    let errors:Vec<String>=threads.into_iter().flat_map(|t|t.join().unwrap()).collect();
    println!("WATCH_COMPETITION {}",json!({"attempts":60,"errors":errors}));
    assert!(errors.is_empty(),"{errors:?}");
    for name in ["one.txt","two.txt"] {
        let path=f.folder.join(name);
        let checksum:String=f.conn().query_row("SELECT checksum FROM local_files WHERE local_path=?1",params![path.to_string_lossy().to_string()],|r|r.get(0)).unwrap();
        assert_eq!(checksum,sha256_file(&path).unwrap());
    }
    assert_eq!(f.conn().query_row("SELECT COUNT(*) FROM local_file_events WHERE status='PENDING'",[],|r|r.get::<_,i64>(0)).unwrap(),2);
    assert_eq!(f.conn().query_row("PRAGMA integrity_check",[],|r|r.get::<_,String>(0)).unwrap(),"ok");
}

#[test]
fn same_file_notifications_create_one_pending_change() {
    use std::sync::{Arc,Barrier};
    let f=WatchConnectionFixture::new();let path=f.ready_file("same.txt");std::fs::write(&path,"one new file state").unwrap();
    let barrier=Arc::new(Barrier::new(2));let mut workers=Vec::new();
    for _ in 0..2 {
        let db=f.db.clone();let path=path.clone();let barrier=barrier.clone();
        workers.push(std::thread::spawn(move||{let mut run=native_watch_runner(&db);barrier.wait();(0..10).map(|i|run(&path,100+i).unwrap()).sum::<i64>()}));
    }
    assert_eq!(workers.into_iter().map(|w|w.join().unwrap()).sum::<i64>(),1);
    assert_eq!(f.conn().query_row("SELECT COUNT(*) FROM local_file_events WHERE status='PENDING'",[],|r|r.get::<_,i64>(0)).unwrap(),1);
}

#[test]
fn watch_write_failure_rolls_back_metadata_and_allows_next_change() {
    let f=WatchConnectionFixture::new();let path=f.ready_file("failure.txt");let mut run=native_watch_runner(&f.db);
    let original:String=f.conn().query_row("SELECT checksum FROM local_files",[],|r|r.get(0)).unwrap();
    f.conn().execute_batch("CREATE TRIGGER controlled_watch_failure BEFORE INSERT ON local_sync_outbox BEGIN SELECT RAISE(ABORT,'controlled watch failure'); END;").unwrap();
    std::fs::write(&path,"changed while failing").unwrap();assert!(run(&path,10).is_err());
    assert_eq!(f.conn().query_row("SELECT checksum FROM local_files",[],|r|r.get::<_,String>(0)).unwrap(),original);
    f.conn().execute_batch("DROP TRIGGER controlled_watch_failure").unwrap();assert_eq!(run(&path,11).unwrap(),1);
    let staged=contract_stage(f.conn(),12).events.remove(0);assert_eq!(staged.file_size_bytes,Some(21));
}

#[test]
fn watch_prepared_request_retry_and_late_failure_keep_latest_state() {
    let f=WatchConnectionFixture::new();let path=f.ready_file("state.txt");let mut run=native_watch_runner(&f.db);
    std::fs::write(&path,"first changed").unwrap();run(&path,10).unwrap();
    let first=contract_stage(f.conn(),11).events.remove(0);
    contract_mark(f.conn(),json!([{"localEventId":first.local_event_id,"status":"FAILED","nextRetryAt":5000}]),12).unwrap();
    for i in 1..=20 {std::fs::write(&path,format!("latest revision {i}")).unwrap();run(&path,20+i).unwrap();}
    assert!(contract_stage(f.conn(),4999).events.is_empty());
    let replay=contract_stage(f.conn(),5000).events.remove(0);assert_eq!(replay,first);
    contract_mark(f.conn(),json!([{"localEventId":first.local_event_id,"resourceId":first.resource_id,"status":"SYNCED"}]),5001).unwrap();
    contract_mark(f.conn(),json!([{"localEventId":first.local_event_id,"status":"FAILED"}]),5002).unwrap();
    let latest=contract_stage(f.conn(),5003).events.remove(0);assert_eq!(latest.file_size_bytes,Some(18));assert!(latest.local_sequence>first.local_sequence);
    contract_mark(f.conn(),json!([{"localEventId":latest.local_event_id,"resourceId":latest.resource_id,"status":"SYNCED"}]),5004).unwrap();
    assert!(contract_stage(f.conn(),5005).events.is_empty());
}
