#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(windows)]
    let _single_instance_guard = match windows_single_instance_guard() {
        Some(guard) => guard,
        None => return,
    };

    bubli_lib::run()
}

#[cfg(windows)]
struct WindowsSingleInstanceGuard(windows_sys::Win32::Foundation::HANDLE);

#[cfg(windows)]
impl Drop for WindowsSingleInstanceGuard {
    fn drop(&mut self) {
        if self.0 == 0 {
            return;
        }
        unsafe {
            let _ = windows_sys::Win32::Foundation::CloseHandle(self.0);
        }
    }
}

#[cfg(windows)]
fn windows_single_instance_guard() -> Option<WindowsSingleInstanceGuard> {
    use windows_sys::Win32::Foundation::{GetLastError, ERROR_ALREADY_EXISTS};
    use windows_sys::Win32::System::Threading::CreateMutexW;

    let mutex_name = "Local\\BubliDesktopSingleInstance";
    let wide_name: Vec<u16> = mutex_name.encode_utf16().chain(std::iter::once(0)).collect();
    let handle = unsafe { CreateMutexW(std::ptr::null_mut(), 1, wide_name.as_ptr()) };
    if handle == 0 {
        return Some(WindowsSingleInstanceGuard(handle));
    }
    if unsafe { GetLastError() } == ERROR_ALREADY_EXISTS {
        unsafe {
            let _ = windows_sys::Win32::Foundation::CloseHandle(handle);
        }
        return None;
    }
    Some(WindowsSingleInstanceGuard(handle))
}
