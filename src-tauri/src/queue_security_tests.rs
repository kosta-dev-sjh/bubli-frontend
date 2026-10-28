#[test]
fn queue_latest_unsent_save_replaces_previous_saves() {
    let conn = test_connection();
    contract_seed(&conn, Some("resource"));
    let mut latest = String::new();
    for i in 1..=100 { latest = contract_record(&conn, "UPDATED", "latest.md", i, i); }
    assert_eq!(contract_count(&conn, "local_file_events"), 1);
    assert_eq!(contract_count(&conn, "local_sync_outbox"), 1);
    assert_eq!(contract_count(&conn, "local_file_event_order"), 1);
    let event = contract_stage(&conn, 1000).events.remove(0);
    assert_eq!(event.local_event_id, latest);
    assert_eq!(event.file_size_bytes, Some(100));
    assert_eq!(event.local_sequence, 100);
}

#[test]
fn queue_prepared_request_is_immutable_while_latest_waits() {
    let conn = test_connection();
    contract_seed(&conn, Some("resource"));
    let first = contract_record(&conn, "UPDATED", "first.md", 10, 1);
    let prepared = serde_json::to_value(contract_stage(&conn, 2).events.remove(0)).unwrap();
    for i in 1..=50 { contract_record(&conn, "UPDATED", "latest.md", 10 + i, 3 + i); }
    assert_eq!(contract_count(&conn, "local_file_events"), 2);
    assert_eq!(serde_json::to_value(contract_stage(&conn, 100).events.remove(0)).unwrap(), prepared);
    contract_mark(&conn, json!([{"localEventId":first,"resourceId":"resource","status":"SYNCED"}]), 101).unwrap();
    let next = contract_stage(&conn, 102).events.remove(0);
    assert_ne!(next.local_event_id, first);
    assert_eq!(next.file_size_bytes, Some(60));
}

#[test]
fn queue_registration_and_latest_waiting_update_survive() {
    let conn = test_connection();
    contract_seed(&conn, None);
    let created = contract_record(&conn, "CREATED", "original.md", 10, 1);
    for i in 1..=30 { contract_record(&conn, "UPDATED", "latest.md", 10 + i, 2 + i); }
    assert_eq!(contract_count(&conn, "local_file_events"), 2);
    assert_eq!(contract_stage(&conn, 100).events[0].local_event_id, created);
    contract_mark(&conn, json!([{"localEventId":created,"resourceId":"assigned","status":"SYNCED"}]), 101).unwrap();
    let update = contract_stage(&conn, 102).events.remove(0);
    assert_eq!(update.resource_id.as_deref(), Some("assigned"));
    assert_eq!(update.file_size_bytes, Some(40));
}

#[test]
fn queue_retry_deadline_survives_close_and_blocks_later_change() {
    let path = std::env::temp_dir().join(format!("bubli-retry-{}.sqlite", Uuid::new_v4()));
    let conn = test_connection_at_path(&path);
    contract_seed(&conn, Some("resource"));
    let first = contract_record(&conn, "UPDATED", "first.md", 10, 1);
    contract_stage(&conn, 2);
    contract_record(&conn, "UPDATED", "second.md", 11, 3);
    contract_mark(&conn, json!([{"localEventId":first,"resourceId":"resource","status":"FAILED","nextRetryAt":10000}]), 4).unwrap();
    drop(conn);
    let conn = Connection::open(&path).unwrap();
    assert!(contract_stage(&conn, 9999).events.is_empty());
    assert_eq!(contract_stage(&conn, 10000).events[0].local_event_id, first);
    drop(conn);
    std::fs::remove_file(path).unwrap();
}

#[test]
fn queue_incomplete_server_list_does_not_remove_resource_mapping() {
    let conn = test_connection();
    contract_seed(&conn, Some("resource"));
    let input = serde_json::from_value(json!({"resourceIds":[],"complete":false})).unwrap();
    assert!(reconcile_local_files_with_server_for_conn(&conn, input, 10).is_err());
    let id: String = conn.query_row("SELECT resource_id FROM local_files", [], |row| row.get(0)).unwrap();
    assert_eq!(id, "resource");
}

#[test]
fn queue_same_path_recreation_is_not_removed_by_old_delete_response() {
    let conn = test_connection();
    let dir = std::env::temp_dir().join(format!("bubli-incarnation-{}", Uuid::new_v4()));
    std::fs::create_dir_all(&dir).unwrap();
    let file = dir.join("original.md");
    std::fs::write(&file, "first").unwrap();
    conn.execute("INSERT INTO managed_folders(id,name,path,status,sync_enabled,created_at,updated_at) VALUES('folder','folder',?1,'ACTIVE',1,1,1)", params![dir.to_str().unwrap()]).unwrap();
    record_watch_path_change(&conn, "folder", &file, 1).unwrap();
    let old = contract_stage(&conn, 2).events.remove(0);
    std::fs::remove_file(&file).unwrap();
    record_watch_path_change(&conn, "folder", &file, 3).unwrap();
    std::fs::write(&file, "replacement").unwrap();
    record_watch_path_change(&conn, "folder", &file, 4).unwrap();
    let new_id: String = conn.query_row("SELECT id FROM local_files WHERE local_path = ?1", params![file.to_str().unwrap()], |row| row.get(0)).unwrap();
    assert_ne!(Some(new_id.as_str()), old.local_file_id.as_deref());
    contract_mark(&conn, json!([{"localEventId":old.local_event_id,"resourceId":"old-resource","status":"SYNCED"}]), 5).unwrap();
    let deletion = contract_stage(&conn, 6).events.into_iter().find(|event| event.event_type == "DELETED").unwrap();
    assert_eq!(deletion.resource_id.as_deref(), Some("old-resource"));
    contract_mark(&conn, json!([{"localEventId":deletion.local_event_id,"resourceId":"old-resource","status":"SYNCED"}]), 7).unwrap();
    let preserved: String = conn.query_row("SELECT id FROM local_files WHERE local_path = ?1", params![file.to_str().unwrap()], |row| row.get(0)).unwrap();
    assert_eq!(preserved, new_id);
    drop(conn);
    std::fs::remove_dir_all(dir).unwrap();
}
