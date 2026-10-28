#[cfg(target_os="windows")]
fn watch_wait_until(timeout:std::time::Duration,mut check:impl FnMut()->bool)->bool {
    let start=std::time::Instant::now();
    while start.elapsed()<timeout {
        if check(){return true;}
        std::thread::sleep(std::time::Duration::from_millis(10));
    }
    check()
}

#[cfg(target_os="windows")]
#[test]
fn retained_watch_connection_is_single_owned_and_released_on_stop() {
    use std::os::windows::fs::OpenOptionsExt;
    use std::time::Duration;
    let mut f=WatchConnectionFixture::new();drop(f.conn.take());
    let watchers=ManagedFolderWatchers::default();
    let exclusive=||std::fs::OpenOptions::new().read(true).write(true).share_mode(0).open(&f.db);
    for _ in 0..3 {
        for _ in 0..2 {
            start_managed_folder_watcher_with_db_path(&watchers,"folder-1".into(),f.folder.to_string_lossy().to_string(),f.db.clone(),|_|{}).unwrap();
        }
        assert_eq!(watchers.0.lock().unwrap().len(),1);
        assert!(exclusive().is_err(),"watcher must own the SQLite file handle");
        let stopped=watchers.0.lock().unwrap().remove("folder-1");drop(stopped);
        assert!(watch_wait_until(Duration::from_secs(5),||exclusive().is_ok()),"SQLite handle must close with the watcher");
    }
}

#[test]
fn retained_watch_setup_failure_does_not_register_a_watcher() {
    let f=WatchConnectionFixture::new();let watchers=ManagedFolderWatchers::default();
    assert!(start_managed_folder_watcher_with_db_path(&watchers,"folder-1".into(),f.folder.to_string_lossy().to_string(),f.folder.clone(),|_|{}).is_err());
    assert!(watchers.0.lock().unwrap().is_empty());
    let invalid=f.root.join("invalid.sqlite");std::fs::write(&invalid,"not a SQLite database").unwrap();
    assert!(start_managed_folder_watcher_with_db_path(&watchers,"folder-1".into(),f.folder.to_string_lossy().to_string(),invalid,|_|{}).is_err());
    assert!(watchers.0.lock().unwrap().is_empty());
}

#[cfg(target_os="windows")]
#[test]
fn two_real_windows_watchers_keep_both_latest_files() {
    use std::time::Duration;
    let f=WatchConnectionFixture::new();let second=f.root.join("second");std::fs::create_dir_all(&second).unwrap();
    f.conn().execute("INSERT INTO managed_folders(id,name,path,status,sync_enabled,created_at,updated_at) VALUES('folder-2','second',?1,'ACTIVE',1,1,1)",params![second.to_string_lossy().to_string()]).unwrap();
    let first=f.ready_file("one.txt");let other=second.join("two.txt");std::fs::write(&other,"original").unwrap();
    record_watch_path_change(f.conn(),"folder-2",&other,1).unwrap();let event=contract_stage(f.conn(),2).events.remove(0);
    contract_mark(f.conn(),json!([{"localEventId":event.local_event_id,"resourceId":"resource-two","status":"SYNCED"}]),3).unwrap();
    let watchers=ManagedFolderWatchers::default();
    for (id,folder) in [("folder-1",&f.folder),("folder-2",&second)] {
        start_managed_folder_watcher_with_db_path(&watchers,id.into(),folder.to_string_lossy().to_string(),f.db.clone(),|_|{}).unwrap();
    }
    std::thread::sleep(Duration::from_millis(250));
    let mut writers=Vec::new();
    for (i,path) in [first.clone(),other.clone()].into_iter().enumerate() {
        writers.push(std::thread::spawn(move||{for n in 1..=20 {std::fs::write(&path,format!("folder {i} revision {n} {}","x".repeat(8192))).unwrap();std::thread::sleep(Duration::from_millis(2));}}));
    }
    for w in writers{w.join().unwrap();}
    let expected=[(&first,sha256_file(&first).unwrap()),(&other,sha256_file(&other).unwrap())];
    assert!(watch_wait_until(Duration::from_secs(5),||expected.iter().all(|(path,hash)|{
        f.conn().query_row("SELECT checksum FROM local_files WHERE local_path=?1",params![path.to_string_lossy().to_string()],|r|r.get::<_,String>(0)).is_ok_and(|actual|actual==*hash)
    })),"both actual watchers must persist the final files");
    watchers.0.lock().unwrap().clear();drop(watchers);
    let staged=contract_stage(f.conn(),10000).events;assert_eq!(staged.len(),2);
    assert!(staged.iter().all(|e|e.event_type=="UPDATED"));
    assert_eq!(f.conn().query_row("PRAGMA integrity_check",[],|r|r.get::<_,String>(0)).unwrap(),"ok");
}
