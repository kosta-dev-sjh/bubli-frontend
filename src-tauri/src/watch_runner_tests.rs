type NativeWatchRunner = Box<dyn FnMut(&Path, i64) -> Result<i64, String>>;
fn native_watch_runner(db_path:&Path)->NativeWatchRunner {
    let conn=open_managed_folder_watch_connection(db_path).unwrap();
    Box::new(move|path,now|record_watch_path_change(&conn,"folder-1",path,now))
}
