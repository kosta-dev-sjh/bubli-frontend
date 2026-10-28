mod io_cost_probe {
    use std::cell::Cell;
    thread_local! {
        static MODE:Cell<Option<u8>>=const{Cell::new(None)};
        static OPENS:Cell<Option<u32>>=const{Cell::new(None)};
    }
    pub(super) struct Guard(Option<u8>);
    pub(super) fn select(mode:u8)->Guard{assert!(mode<4);Guard(MODE.with(|m|m.replace(Some(mode))))}
    impl Drop for Guard{fn drop(&mut self){MODE.with(|m|m.set(self.0));}}
    pub(super) fn preview_enabled()->bool{MODE.with(|m|m.get().map(|v|v&1!=0).unwrap_or(true))}
    pub(super) fn fts_enabled()->bool{MODE.with(|m|m.get().map(|v|v&2!=0).unwrap_or(true))}
    pub(super) fn begin_opens(){OPENS.with(|n|{assert!(n.get().is_none());n.set(Some(0));});}
    pub(super) fn content_open(){OPENS.with(|n|{if let Some(v)=n.get(){n.set(Some(v+1));}});}
    pub(super) fn finish_opens()->u32{OPENS.with(|n|n.replace(None).unwrap())}
}
