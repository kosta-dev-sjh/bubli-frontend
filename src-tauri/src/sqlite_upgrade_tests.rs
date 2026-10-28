#[test]
fn fixed_sqlite_runtime_is_the_locked_upstream_engine() {
    assert_eq!(rusqlite::version(), "3.54.1");
    assert_eq!(rusqlite::version_number(), 3_054_001);
    let conn=test_connection();
    let source:String=conn.query_row("SELECT sqlite_source_id()",[],|r|r.get(0)).unwrap();
    assert!(source.contains("555e07ef33f69a0957d24d8e555b702464a131d6f1607f4c3c1e4551e8e6ca76"));
    println!("SQLITE_ENGINE {}",json!({"version":rusqlite::version(),"sourceId":source}));
}

#[test]
fn sqlite_345_fixture_keeps_retry_and_fixed_payload_through_migration() {
    let input=Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/sqlite-3.45-queue.sqlite");
    let target=std::env::temp_dir().join(format!("bubli-upgrade-{}.sqlite",Uuid::new_v4()));
    std::fs::copy(input,&target).unwrap();
    let conn=Connection::open(&target).unwrap();crate::local_db::configure_connection(&conn);
    let fixed:String=conn.query_row("SELECT payload_json FROM local_sync_outbox WHERE payload_sealed=1",[],|r|r.get(0)).unwrap();
    let id=serde_json::from_str::<serde_json::Value>(&fixed).unwrap()["localEventId"].as_str().unwrap().to_owned();
    for _ in 0..2{crate::local_db::migrate_file_sync_outbox(&conn).unwrap();}
    assert_eq!(contract_count(&conn,"local_file_events"),2);
    assert!(contract_stage(&conn,4999).events.is_empty());
    let replay=contract_stage(&conn,5000).events.remove(0);
    assert_eq!(serde_json::to_value(&replay).unwrap(),serde_json::from_str::<serde_json::Value>(&fixed).unwrap());
    contract_mark(&conn,json!([{"localEventId":id,"resourceId":"resource","status":"SYNCED"}]),5001).unwrap();
    let latest=contract_stage(&conn,5002).events.remove(0);
    assert_eq!(latest.file_size_bytes,Some(3));assert_eq!(latest.local_sequence,3);
    contract_mark(&conn,json!([{"localEventId":latest.local_event_id,"resourceId":"resource","status":"SYNCED"}]),5003).unwrap();
    assert!(contract_stage(&conn,5004).events.is_empty());
    assert_eq!(conn.query_row("PRAGMA integrity_check",[],|r|r.get::<_,String>(0)).unwrap(),"ok");
    drop(conn);std::fs::remove_file(target).unwrap();
}

#[test]
fn fixed_sqlite_serializes_two_writers_while_checkpoints_run() {
    use std::sync::{Arc,Barrier};
    let path=std::env::temp_dir().join(format!("bubli-fixed-wal-{}.sqlite",Uuid::new_v4()));
    let conn=test_connection_at_path(&path);contract_seed(&conn,Some("resource"));
    conn.execute("INSERT INTO local_files(id,local_folder_id,file_name,local_path,resource_id,sync_status,updated_at) VALUES('other-file','contract-folder','other.md','/contract/other.md','other-resource','SYNCED',1)",[]).unwrap();
    let start=Arc::new(Barrier::new(3));
    let mut threads=Vec::new();
    for file in ["contract-file","other-file"] {
        let path=path.clone();let start=start.clone();
        threads.push(std::thread::spawn(move||{
            let conn=Connection::open(path).unwrap();crate::local_db::configure_connection(&conn);
            start.wait();
            for i in 1..=50 {record_event(&conn,"contract-folder",Some(file),"UPDATED","file.md","/contract/file.md",None,i,None,i).unwrap();}
        }));
    }
    let checkpoint=Connection::open(&path).unwrap();crate::local_db::configure_connection(&checkpoint);start.wait();
    for _ in 0..50 {
        let result:(i64,i64,i64)=checkpoint.query_row("PRAGMA wal_checkpoint(PASSIVE)",[],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).unwrap();
        assert!(result.0==0||result.0==1);
        std::thread::yield_now();
    }
    for t in threads{t.join().unwrap();}
    assert_eq!(contract_count(&conn,"local_file_events"),2);
    let sizes:i64=conn.query_row("SELECT SUM(size_bytes) FROM local_file_events",[],|r|r.get(0)).unwrap();assert_eq!(sizes,100);
    let high:i64=conn.query_row("SELECT seq FROM sqlite_sequence WHERE name='local_file_event_order'",[],|r|r.get(0)).unwrap();assert_eq!(high,100);
    assert_eq!(conn.query_row("PRAGMA integrity_check",[],|r|r.get::<_,String>(0)).unwrap(),"ok");
    drop(checkpoint);drop(conn);std::fs::remove_file(path).unwrap();
}
