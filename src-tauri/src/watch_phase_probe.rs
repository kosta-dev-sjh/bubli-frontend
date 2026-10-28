mod watch_phase_probe {
    use std::{cell::RefCell, time::Instant};
    struct Probe { start:Instant, last:Instant, phases:Vec<(&'static str,u64)> }
    thread_local! {static ACTIVE:RefCell<Option<Probe>>=const {RefCell::new(None)};}
    pub(super) fn begin() {
        ACTIVE.with(|slot|{
            let mut slot=slot.borrow_mut();assert!(slot.is_none());
            let phases=Vec::with_capacity(20);let start=Instant::now();
            *slot=Some(Probe{start,last:start,phases});
        });
    }
    pub(super) fn mark(name:&'static str) {
        ACTIVE.with(|slot|{if let Some(p)=slot.borrow_mut().as_mut(){
            let now=Instant::now();p.phases.push((name,now.duration_since(p.last).as_nanos() as u64));p.last=now;
        }});
    }
    pub(super) fn finish()->(u64,Vec<(&'static str,u64)>) {
        mark("other");
        ACTIVE.with(|slot|{
            let p=slot.borrow_mut().take().unwrap();
            let total=p.last.duration_since(p.start).as_nanos() as u64;
            assert_eq!(p.phases.iter().map(|(_,ns)|ns).sum::<u64>(),total);
            (total,p.phases)
        })
    }
}
