#[test]
fn io_cost_preview_uses_one_content_open_and_matches_digest(){
    let f=WatchConnectionFixture::new();let path=f.ready_file("once.txt");let bytes=b"shared checksum and searchable contents";std::fs::write(&path,bytes).unwrap();
    io_cost_probe::begin_opens();assert_eq!(record_watch_path_change(f.conn(),"folder-1",&path,10).unwrap(),1);assert_eq!(io_cost_probe::finish_opens(),1);
    let actual:String=f.conn().query_row("SELECT checksum FROM local_files",[],|r|r.get(0)).unwrap();assert_eq!(actual,format!("{:x}",Sha256::digest(bytes)));
    let text:String=f.conn().query_row("SELECT content FROM local_file_fts",[],|r|r.get(0)).unwrap();assert_eq!(text,std::str::from_utf8(bytes).unwrap());
}

#[test]
fn io_cost_preview_limit_keeps_the_complete_hash(){
    let f=WatchConnectionFixture::new();let path=f.folder.join("limit.txt");let mut bytes=vec![b'x';MAX_EXTRACT_BYTES as usize+65537];let last=bytes.len()-1;bytes[last]=b'z';std::fs::write(&path,&bytes).unwrap();
    let(hash,text)=sha256_file_with_preview(&path,true).unwrap();assert_eq!(hash,format!("{:x}",Sha256::digest(&bytes)));assert_eq!(text,Some(String::new()));
    assert_eq!(sha256_file_with_preview(&path,false).unwrap().1,None);
}

#[test]
fn io_cost_fts_noop_writes_nothing_and_updates_keep_rowid(){
    let f=WatchConnectionFixture::new();let path=f.ready_file("index.txt");let(id,rowid):(String,i64)=f.conn().query_row("SELECT local_file_id,rowid FROM local_file_fts",[],|r|Ok((r.get(0)?,r.get(1)?))).unwrap();
    let prior=io_cost_wal(f.conn());let changes=f.conn().total_changes();
    write_file_fts_content(f.conn(),&id,"index.txt",&path.to_string_lossy(),"original").unwrap();assert_eq!(f.conn().total_changes(),changes);assert_eq!(io_cost_wal(f.conn()),prior);
    write_file_fts_content(f.conn(),&id,"index.txt",&path.to_string_lossy(),"replacedtoken").unwrap();
    assert_eq!(f.conn().query_row("SELECT rowid FROM local_file_fts WHERE local_file_id=?1",params![id],|r|r.get::<_,i64>(0)).unwrap(),rowid);
    assert_eq!(f.conn().query_row("SELECT COUNT(*) FROM local_file_fts WHERE local_file_fts MATCH 'replacedtoken'",[],|r|r.get::<_,i64>(0)).unwrap(),1);
    assert_eq!(f.conn().query_row("SELECT COUNT(*) FROM local_file_fts WHERE local_file_fts MATCH 'original'",[],|r|r.get::<_,i64>(0)).unwrap(),0);
}

#[test]
fn io_cost_fts_duplicate_rows_are_repaired(){
    let f=WatchConnectionFixture::new();let path=f.ready_file("duplicate.txt");let id:String=f.conn().query_row("SELECT id FROM local_files",[],|r|r.get(0)).unwrap();
    for text in ["original","duplicate"]{f.conn().execute("INSERT INTO local_file_fts(local_file_id,file_name,content,local_path) VALUES(?1,'duplicate.txt',?2,?3)",params![id,text,path.to_string_lossy()]).unwrap();}
    write_file_fts_content(f.conn(),&id,"duplicate.txt",&path.to_string_lossy(),"original").unwrap();
    assert_eq!(f.conn().query_row("SELECT COUNT(*) FROM local_file_fts WHERE local_file_id=?1",params![id],|r|r.get::<_,i64>(0)).unwrap(),1);
}

#[test]
fn io_cost_fts_and_metadata_roll_back_after_outbox_failure(){
    let f=WatchConnectionFixture::new();let path=f.ready_file("rollback.txt");let original:String=f.conn().query_row("SELECT checksum FROM local_files",[],|r|r.get(0)).unwrap();
    f.conn().execute_batch("CREATE TRIGGER fail_preview_outbox BEFORE INSERT ON local_sync_outbox BEGIN SELECT RAISE(ABORT,'controlled outbox failure'); END;").unwrap();std::fs::write(&path,"new searchable rollback content").unwrap();
    assert!(record_watch_path_change(f.conn(),"folder-1",&path,10).is_err());
    assert_eq!(f.conn().query_row("SELECT checksum FROM local_files",[],|r|r.get::<_,String>(0)).unwrap(),original);
    assert_eq!(f.conn().query_row("SELECT content FROM local_file_fts",[],|r|r.get::<_,String>(0)).unwrap(),"original");
    f.conn().execute_batch("DROP TRIGGER fail_preview_outbox").unwrap();assert_eq!(record_watch_path_change(f.conn(),"folder-1",&path,11).unwrap(),1);
}

#[test]
fn io_cost_captured_text_stays_with_the_hashed_bytes(){
    let f=WatchConnectionFixture::new();let path=f.ready_file("snapshot.txt");std::fs::write(&path,"first complete file snapshot").unwrap();let metadata=std::fs::metadata(&path);
    let (hash,preview)=sha256_file_with_preview(&path,true).unwrap();std::fs::write(&path,"second replacement body after hashing").unwrap();
    with_file_change_savepoint(f.conn(),|conn|record_watch_path_change_in_savepoint(conn,"folder-1",&path,10,metadata,Some(hash.clone()),preview)).unwrap();
    assert_eq!(f.conn().query_row("SELECT checksum FROM local_files",[],|r|r.get::<_,String>(0)).unwrap(),hash);
    assert_eq!(f.conn().query_row("SELECT content FROM local_file_fts",[],|r|r.get::<_,String>(0)).unwrap(),"first complete file snapshot");
    record_watch_path_change(f.conn(),"folder-1",&path,11).unwrap();assert_eq!(f.conn().query_row("SELECT content FROM local_file_fts",[],|r|r.get::<_,String>(0)).unwrap(),"second replacement body after hashing");
}

#[test]
fn io_cost_previews_preserve_existing_text_decoding(){
    let f=WatchConnectionFixture::new();let path=f.folder.join("encoding.txt");
    for bytes in [vec![],vec![0xef,0xbb,0xbf,b'a'],vec![0xff,0xfe,b'a',0],vec![0xb0,0xa1,b' ',b'b']]{
        std::fs::write(&path,&bytes).unwrap();let (hash,preview)=sha256_file_with_preview(&path,true).unwrap();assert_eq!(hash,format!("{:x}",Sha256::digest(&bytes)));
        assert_eq!(preview.unwrap(),extract_text_preview(&path).unwrap_or_default());
    }
}

#[test]
fn io_cost_fts_standalone_connections_serialize_writes(){
    use std::sync::{Arc,Barrier};
    let f=WatchConnectionFixture::new();f.ready_file("one.txt");f.ready_file("two.txt");let barrier=Arc::new(Barrier::new(2));let mut workers=Vec::new();
    for name in ["one.txt","two.txt"]{
        let db=f.db.clone();let barrier=barrier.clone();let path=f.folder.join(name);
        workers.push(std::thread::spawn(move||{
            let c=Connection::open(db).unwrap();crate::local_db::configure_connection(&c);let id:String=c.query_row("SELECT local_file_id FROM local_file_fts WHERE file_name=?1",params![name],|r|r.get(0)).unwrap();barrier.wait();
            for n in 0..30{write_file_fts_content(&c,&id,name,&path.to_string_lossy(),&format!("{name} revision {n}")).unwrap();}
        }));
    }
    for worker in workers{worker.join().unwrap();}
    for name in ["one.txt","two.txt"]{assert_eq!(f.conn().query_row("SELECT content FROM local_file_fts WHERE file_name=?1",params![name],|r|r.get::<_,String>(0)).unwrap(),format!("{name} revision 29"));}
    assert_eq!(f.conn().query_row("PRAGMA integrity_check",[],|r|r.get::<_,String>(0)).unwrap(),"ok");
}
