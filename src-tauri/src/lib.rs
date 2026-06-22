#[tauri::command]
fn app_ready() -> &'static str {
    "bubli-tauri-ready"
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![app_ready])
        .run(tauri::generate_context!())
        .expect("failed to run Bubli Tauri application");
}
