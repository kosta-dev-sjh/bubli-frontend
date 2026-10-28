#[test]
#[ignore = "subprocess helper; run only from the parent contract"]
fn watch_process_exit_child() {
    use std::io::Write;
    let root=PathBuf::from(std::env::var_os("BUBLI_EXIT_ROOT").expect("isolated child root"));
    let scenario=std::env::var("BUBLI_EXIT_SCENARIO").unwrap();
    let db=root.join("test.sqlite");let file=root.join("files").join("exit.txt");
    let conn=Connection::open(&db).unwrap();crate::local_db::configure_connection(&conn);
    let mut run=native_watch_runner(&db);std::fs::write(&file,"first pending file").unwrap();run(&file,10).unwrap();
    let mut prepared=serde_json::Value::Null;
    if scenario=="prepared_then_new" {
        prepared=serde_json::to_value(contract_stage(&conn,11).events.remove(0)).unwrap();
        std::fs::write(&file,"latest pending file content").unwrap();run(&file,12).unwrap();
    }else if scenario=="uncommitted" {
        conn.execute_batch("SAVEPOINT pending_exit").unwrap();
        record_event(&conn,"folder-1",None,"CREATED","not_committed.txt","/not_committed.txt",None,123,None,13).unwrap();
    }
    println!("EXIT_CHILD {}",json!({"scenario":scenario,"prepared":prepared}));std::io::stdout().flush().unwrap();
    std::process::exit(0);
}

#[test]
fn watch_process_exit_recovers_pending_prepared_and_uncommitted_states() {
    for scenario in ["pending","prepared_then_new","uncommitted"] {for _ in 0..3 {
        let mut f=WatchConnectionFixture::new();let file=f.ready_file("exit.txt");
        drop(f.conn.take());
        let output=std::process::Command::new(std::env::current_exe().unwrap())
            .args(["--ignored","--exact","local_files::tests::watch_process_exit_child","--nocapture"])
            .env("BUBLI_EXIT_ROOT",&f.root).env("BUBLI_EXIT_SCENARIO",scenario).output().unwrap();
        assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
        let text=String::from_utf8(output.stdout).unwrap();let line=text.lines().find_map(|s|s.strip_prefix("EXIT_CHILD ")).unwrap();
        let state:serde_json::Value=serde_json::from_str(line).unwrap();
        let conn=Connection::open(&f.db).unwrap();crate::local_db::configure_connection(&conn);
        if scenario=="prepared_then_new" {
            let replay=contract_stage(&conn,100).events.remove(0);assert_eq!(serde_json::to_value(&replay).unwrap(),state["prepared"]);
            contract_mark(&conn,json!([{"localEventId":replay.local_event_id,"resourceId":replay.resource_id,"status":"SYNCED"}]),101).unwrap();
        }
        if scenario=="uncommitted"{assert_eq!(conn.query_row("SELECT COUNT(*) FROM local_file_events WHERE file_name='not_committed.txt'",[],|r|r.get::<_,i64>(0)).unwrap(),0);}
        let latest=contract_stage(&conn,102).events.remove(0);
        assert_eq!(latest.file_size_bytes,Some(std::fs::metadata(&file).unwrap().len() as i64));
        contract_mark(&conn,json!([{"localEventId":latest.local_event_id,"resourceId":latest.resource_id,"status":"SYNCED"}]),103).unwrap();
        assert!(contract_stage(&conn,104).events.is_empty());
        assert_eq!(conn.query_row("PRAGMA integrity_check",[],|r|r.get::<_,String>(0)).unwrap(),"ok");
        println!("EXIT_RECOVERED {scenario}");
    }}
}
