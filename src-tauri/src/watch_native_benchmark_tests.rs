#[test]
#[ignore = "explicit headless Criterion measurement"]
fn native_watch_connection_benchmark() {
    use criterion::{BatchSize,Criterion};
    use std::io::{Seek,SeekFrom,Write};
    use std::time::Duration;
    let output=PathBuf::from(std::env::var("BUBLI_BENCH_OUTPUT").expect("fresh benchmark directory"));
    assert!(!output.exists());
    let mut c=Criterion::default().sample_size(30).warm_up_time(Duration::from_millis(500)).measurement_time(Duration::from_secs(3)).output_directory(&output);
    for (name,size) in [("text_1KiB",1024_usize),("binary_30MiB",30*1024*1024)] {
        let f=WatchConnectionFixture::new();
        let path=f.ready_file(if size==1024{"bench.txt"}else{"bench.bin"});
        std::fs::write(&path,vec![b'x';size]).unwrap();
        let mut run=native_watch_runner(&f.db);run(&path,10).unwrap();
        let mut sequence=100_i64;
        c.bench_function(name,|b|{
            b.iter_batched(||{
                sequence+=1;
                let mut file=std::fs::OpenOptions::new().write(true).open(&path).unwrap();
                file.seek(if size==1024{SeekFrom::Start(0)}else{SeekFrom::End(-16)}).unwrap();
                write!(file,"{sequence:016}").unwrap();
                sequence
            },|now|assert_eq!(run(&path,now).unwrap(),1),BatchSize::PerIteration);
            let hash:String=f.conn().query_row("SELECT checksum FROM local_files",[],|r|r.get(0)).unwrap();
            assert_eq!(hash,sha256_file(&path).unwrap());
            assert_eq!(f.conn().query_row("SELECT COUNT(*) FROM local_file_events WHERE status='PENDING'",[],|r|r.get::<_,i64>(0)).unwrap(),1);
        });
        drop(run);
    }
    c.final_summary();
}
