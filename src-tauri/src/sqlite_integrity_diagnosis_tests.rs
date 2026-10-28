fn diagnostic_fixture()->(PathBuf,Connection){
    let root=std::env::var_os("BUBLI_INTEGRITY_TEST_ROOT").map(PathBuf::from).unwrap_or_else(std::env::temp_dir).join(uuid::Uuid::new_v4().to_string());
    std::fs::create_dir_all(&root).unwrap();let path=root.join("local.sqlite3");
    let c=super::test_database_with_production_schema(&path);(path,c)
}
fn diagnostic_raw(c:&Connection)->Vec<String>{c.prepare("PRAGMA quick_check").unwrap().query_map([],|r|r.get(0)).unwrap().collect::<Result<_,_>>().unwrap()}

#[test]
fn fts_diagnostic_long_connection_checks_latest_committed_index(){
    let (p,c)=diagnostic_fixture();assert_eq!(diagnostic_raw(&c),["ok"]);
    let writer=Connection::open(&p).unwrap();super::configure_connection(&writer);
    writer.execute_batch("INSERT INTO local_file_fts(local_file_id,file_name,content,local_path) VALUES('one','file.bin','alpha lighthouse','D:/취준/file.bin');").unwrap();
    assert_ne!(diagnostic_raw(&c),["ok"],"Stock SQLite stale-cache condition must be exercised");
    let result=check_local_sqlite_integrity_for_conn(&c).unwrap();assert!(result.ok,"{}",result.quick_check);assert!(!result.recovery_required);
    assert_eq!(c.query_row("SELECT count(*) FROM local_file_fts WHERE local_file_fts MATCH 'alpha'",[],|r|r.get::<_,i64>(0)).unwrap(),1);
}

#[test]
fn fts_diagnostic_does_not_rewrite_index_or_change_queue(){
    let (p,c)=diagnostic_fixture();assert_eq!(diagnostic_raw(&c),["ok"]);let w=Connection::open(&p).unwrap();super::configure_connection(&w);
    w.execute_batch("INSERT INTO local_file_fts(local_file_id,file_name,content,local_path) VALUES('one','file.bin','alpha lighthouse','/file.bin');").unwrap();
    let before:Vec<(i64,Vec<u8>)>=w.prepare("SELECT id,block FROM local_file_fts_data ORDER BY id").unwrap().query_map([],|r|Ok((r.get(0)?,r.get(1)?))).unwrap().collect::<Result<_,_>>().unwrap();
    let count=c.total_changes();for _ in 0..3 {assert!(check_local_sqlite_integrity_for_conn(&c).unwrap().ok);}
    let after:Vec<(i64,Vec<u8>)>=w.prepare("SELECT id,block FROM local_file_fts_data ORDER BY id").unwrap().query_map([],|r|Ok((r.get(0)?,r.get(1)?))).unwrap().collect::<Result<_,_>>().unwrap();
    assert_eq!(before,after);assert_eq!(c.total_changes(),count);assert_eq!(w.query_row("SELECT count(*) FROM local_file_events",[],|r|r.get::<_,i64>(0)).unwrap(),0);
}

#[test]
fn fts_diagnostic_reports_actual_content_index_mismatch(){
    let (p,c)=diagnostic_fixture();let w=Connection::open(&p).unwrap();
    w.execute_batch("INSERT INTO local_file_fts(local_file_id,file_name,content,local_path) VALUES('one','file.bin','alpha lighthouse','/file.bin'); UPDATE local_file_fts_content SET c2='omega controlled corruption' WHERE id=1;").unwrap();
    let result=check_local_sqlite_integrity_for_conn(&c).unwrap();assert!(!result.ok);assert!(result.recovery_required);assert_ne!(result.quick_check,"ok");
}

#[test]
fn fts_diagnostic_memory_connection_keeps_existing_contract(){
    let c=Connection::open_in_memory().unwrap();c.execute_batch(SCHEMA_SQL).unwrap();
    c.execute_batch("INSERT INTO local_file_fts(file_name,content) VALUES('memory.bin','alpha lighthouse');").unwrap();
    let result=check_local_sqlite_integrity_for_conn(&c).unwrap();assert!(result.ok);assert_eq!(result.database_size_bytes,0);
}

#[test]
fn fts_diagnostic_refuses_to_ignore_an_uncommitted_transaction(){
    let (_p,c)=diagnostic_fixture();c.execute_batch("BEGIN; INSERT INTO local_file_fts(file_name,content) VALUES('uncommitted.bin','alpha lighthouse');").unwrap();
    assert!(check_local_sqlite_integrity_for_conn(&c).is_err());c.execute_batch("ROLLBACK").unwrap();assert!(check_local_sqlite_integrity_for_conn(&c).unwrap().ok);
}

#[test]
fn fts_diagnostic_read_snapshot_allows_writer_and_keeps_latest_search(){
    use std::sync::{Arc,Barrier};
    let (p,c)=diagnostic_fixture();assert_eq!(diagnostic_raw(&c),["ok"]);
    let barrier=Arc::new(Barrier::new(2));let gate=barrier.clone();
    let worker=std::thread::spawn(move||{let w=Connection::open(p).unwrap();super::configure_connection(&w);gate.wait();for n in 0..30{w.execute("INSERT INTO local_file_fts(file_name,content) VALUES(?1,'alpha lighthouse')",params![format!("file-{n}.bin")]).unwrap();}});
    barrier.wait();for _ in 0..30{let result=check_local_sqlite_integrity_for_conn(&c).unwrap();assert!(result.ok,"{}",result.quick_check);}
    worker.join().unwrap();assert!(check_local_sqlite_integrity_for_conn(&c).unwrap().ok);
    assert_eq!(c.query_row("SELECT count(*) FROM local_file_fts WHERE local_file_fts MATCH 'alpha'",[],|r|r.get::<_,i64>(0)).unwrap(),30);
}
