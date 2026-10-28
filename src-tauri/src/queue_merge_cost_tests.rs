#[test]
fn merge_cached_delete_still_rolls_back_after_schema_changes() {
    let conn=test_connection();
    contract_seed(&conn,Some("resource"));
    contract_record(&conn,"UPDATED","first.md",1,1);
    let last=contract_record(&conn,"UPDATED","second.md",2,2);
    let payload=contract_outbox(&conn,&last).1;
    conn.execute_batch("CREATE TRIGGER fail_cached_delete BEFORE DELETE ON local_sync_outbox BEGIN SELECT RAISE(ABORT,'cached replacement must roll back'); END; CREATE TRIGGER fail_cached_update BEFORE UPDATE ON local_sync_outbox BEGIN SELECT RAISE(ABORT,'cached replacement must roll back'); END;").unwrap();
    assert!(record_event(&conn,"contract-folder",Some("contract-file"),"UPDATED","third.md","/contract/original.md",Some("new"),3,Some(3),3).is_err());
    assert_eq!(contract_count(&conn,"local_file_events"),1);
    assert_eq!(contract_count(&conn,"local_file_event_order"),1);
    assert_eq!(contract_outbox(&conn,&last).1,payload);
    assert!(conn.is_autocommit());
}

#[test]
fn merge_cache_is_optional_and_never_reuses_query_results() {
    let conn=test_connection();
    conn.set_prepared_statement_cache_capacity(0);
    contract_seed(&conn,Some("resource"));
    for i in 1..=20 {contract_record(&conn,"UPDATED","latest.md",i,i);}
    let fixed=contract_stage(&conn,30).events.remove(0);
    for i in 21..=40 {contract_record(&conn,"UPDATED","latest.md",i,i);}
    assert_eq!(contract_count(&conn,"local_file_events"),2);
    assert_eq!(contract_stage(&conn,50).events[0].local_event_id,fixed.local_event_id);
    contract_mark(&conn,json!([{"localEventId":fixed.local_event_id,"resourceId":"resource","status":"SYNCED"}]),51).unwrap();
    assert_eq!(contract_stage(&conn,52).events[0].file_size_bytes,Some(40));
}

#[test]
fn merge_barrier_index_migration_keeps_existing_events() {
    let conn=test_connection();
    contract_seed(&conn,Some("resource"));
    contract_record(&conn,"CREATED","registered.md",1,1);
    contract_record(&conn,"UPDATED","first.md",2,2);
    conn.execute_batch("DROP INDEX idx_file_events_merge_barriers").unwrap();
    let count=contract_count(&conn,"local_file_events");
    crate::local_db::migrate_file_sync_outbox(&conn).unwrap();
    crate::local_db::migrate_file_sync_outbox(&conn).unwrap();
    assert_eq!(contract_count(&conn,"local_file_events"),count);
    let sql:String=conn.query_row("SELECT sql FROM sqlite_master WHERE name='idx_file_events_merge_barriers'",[],|row|row.get(0)).unwrap();
    assert!(sql.contains("event_type <> 'UPDATED' OR status = 'REJECTED'"));
}

#[test]
fn merge_keeps_completed_history_and_a_deletion_between_edits() {
    let conn=test_connection();
    contract_seed(&conn,Some("resource"));
    conn.execute_batch("WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<1000) INSERT INTO local_file_events(id,local_file_id,local_folder_id,event_type,file_name,local_path,size_bytes,status,created_at) SELECT 'history-'||x,'contract-file','contract-folder','UPDATED','old.md','/contract/old.md',1,'SYNCED',x FROM n;").unwrap();
    let before_delete=contract_record(&conn,"UPDATED","first.md",1,1001);
    let deletion=contract_record(&conn,"DELETED","first.md",1,1002);
    for i in 1..=20 {contract_record(&conn,"UPDATED","latest.md",i,1002+i);}
    assert_eq!(contract_count(&conn,"local_file_events"),1003);
    assert_eq!(contract_status(&conn,&before_delete).0,"PENDING");
    assert_eq!(contract_status(&conn,&deletion).0,"PENDING");
    let completed:i64=conn.query_row("SELECT COUNT(*) FROM local_file_events WHERE status='SYNCED'",[],|r|r.get(0)).unwrap();
    assert_eq!(completed,1000);
}

#[test]
fn merge_fast_check_does_not_treat_another_files_pending_update_as_its_own() {
    let conn=test_connection();
    contract_seed(&conn,Some("resource"));
    let first=contract_record(&conn,"UPDATED","first.md",1,1);
    conn.execute("INSERT INTO local_files(id,local_folder_id,file_name,local_path,resource_id,sync_status,updated_at) VALUES('other-file','contract-folder','other.md','/contract/other.md','other-resource','SYNCED',1)",[]).unwrap();
    record_event(&conn,"contract-folder",Some("other-file"),"UPDATED","other.md","/contract/other.md",Some("other"),2,Some(2),2).unwrap();
    assert_eq!(contract_count(&conn,"local_file_events"),2);
    assert_eq!(contract_status(&conn,&first).0,"PENDING");
    let fixed=contract_stage(&conn,3);
    assert_eq!(fixed.events.len(),2);
}
