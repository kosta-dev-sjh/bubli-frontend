use std::{collections::HashMap, env, sync::Mutex};

use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, LogicalPosition, LogicalSize, Manager, Position, Size, WebviewUrl,
    WebviewWindowBuilder,
};
use tauri::utils::config::Color;

mod activity;
mod local_db;
mod local_files;
mod widget_usage;

const WIDGET_WINDOW_LABEL_PREFIX: &str = "bubli-widget";
const WIDGET_WINDOW_URL: &str = "desktop-widget";
const DEFAULT_WIDGET_BUBBLE_TYPE: &str = "todo";
const WIDGET_DEFAULT_WIDTH: f64 = 324.0;
const WIDGET_DEFAULT_HEIGHT: f64 = 392.0;
const WIDGET_BAR_WIDTH: f64 = 360.0;
const WIDGET_BAR_HEIGHT: f64 = 168.0;
const WIDGET_MENU_SIZE: f64 = 192.0;
const WIDGET_MINIMIZED_WIDTH: f64 = 188.0;
const WIDGET_MINIMIZED_HEIGHT: f64 = 72.0;
const QA_ALL_WIDGET_BUBBLES: [&str; 8] = [
    "todo",
    "agent",
    "chat",
    "timer",
    "memo",
    "schedule",
    "resource",
    "alert",
];

#[tauri::command]
fn app_ready() -> &'static str {
    "bubli-tauri-ready"
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WidgetWindowPosition {
    x: i32,
    y: i32,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WidgetWindowState {
    active_bubble: String,
    always_on_top: bool,
    click_through: bool,
    dock_orb_visible: bool,
    mode: String,
    position: WidgetWindowPosition,
    shortcut: Option<String>,
    tray_visible: bool,
    window_id: Option<String>,
    window_visible: bool,
}

impl Default for WidgetWindowState {
    fn default() -> Self {
        default_widget_window_state(DEFAULT_WIDGET_BUBBLE_TYPE, None)
    }
}

#[derive(Clone)]
struct WidgetWindowStore {
    active_bubble: String,
    bubbles: HashMap<String, WidgetWindowState>,
}

impl Default for WidgetWindowStore {
    fn default() -> Self {
        let active_bubble = DEFAULT_WIDGET_BUBBLE_TYPE.to_string();
        let mut bubbles = HashMap::new();
        bubbles.insert(
            active_bubble.clone(),
            default_widget_window_state(&active_bubble, None),
        );

        Self {
            active_bubble,
            bubbles,
        }
    }
}

type WidgetState = Mutex<WidgetWindowStore>;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetWindowModeInput {
    bubble_type: Option<String>,
    mode: String,
    window_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetWindowPositionInput {
    bubble_type: Option<String>,
    window_id: Option<String>,
    x: i32,
    y: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetWindowOpenInput {
    bubble_type: Option<String>,
    mode: Option<String>,
    window_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetWindowTargetInput {
    bubble_type: Option<String>,
    window_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetBooleanInput {
    bubble_type: Option<String>,
    enabled: bool,
    window_id: Option<String>,
}

#[derive(Deserialize)]
struct WidgetShortcutInput {
    shortcut: String,
}

fn default_widget_window_state(bubble_type: &str, window_id: Option<String>) -> WidgetWindowState {
    let offset = match bubble_type {
        "agent" => 28,
        "chat" => 56,
        "timer" => 84,
        "memo" => 112,
        "schedule" => 140,
        "resource" => 168,
        "alert" => 196,
        "bar" => 224,
        "menu" => 252,
        _ => 0,
    };

    WidgetWindowState {
        always_on_top: true,
        active_bubble: bubble_type.to_string(),
        click_through: false,
        dock_orb_visible: false,
        mode: "DEFAULT".to_string(),
        position: WidgetWindowPosition {
            x: 32 + offset,
            y: 32 + offset,
        },
        shortcut: Some("CommandOrControl+Shift+B".to_string()),
        tray_visible: true,
        window_id,
        window_visible: false,
    }
}

fn resolve_target_bubble(store: &WidgetWindowStore, requested: Option<String>) -> String {
    requested.unwrap_or_else(|| store.active_bubble.clone())
}

fn with_widget_state(
    state: tauri::State<'_, WidgetState>,
    bubble_type: Option<String>,
    window_id: Option<String>,
    update: impl FnOnce(&mut WidgetWindowState),
) -> Result<WidgetWindowState, String> {
    let mut guard = state
        .lock()
        .map_err(|_| "widget state lock failed".to_string())?;
    let target = normalize_bubble_type(Some(resolve_target_bubble(&guard, bubble_type)));
    let window_key = normalize_window_key(&target, window_id);
    guard.active_bubble = target.clone();
    let widget = guard
        .bubbles
        .entry(window_key.clone())
        .or_insert_with(|| default_widget_window_state(&target, Some(window_key)));
    update(widget);
    Ok(widget.clone())
}

fn normalize_bubble_type(value: Option<String>) -> String {
    match value.as_deref() {
        Some("agent") => "agent".to_string(),
        Some("chat") => "chat".to_string(),
        Some("timer") => "timer".to_string(),
        Some("memo") => "memo".to_string(),
        Some("schedule") => "schedule".to_string(),
        Some("resource") => "resource".to_string(),
        Some("alert") => "alert".to_string(),
        Some("bar") => "bar".to_string(),
        Some("menu") => "menu".to_string(),
        _ => DEFAULT_WIDGET_BUBBLE_TYPE.to_string(),
    }
}

fn normalize_widget_mode(value: String) -> String {
    match value.as_str() {
        "GHOST" => "GHOST".to_string(),
        "MINIMIZED" => "MINIMIZED".to_string(),
        "TRANSLUCENT" => "TRANSLUCENT".to_string(),
        _ => "DEFAULT".to_string(),
    }
}

fn normalize_window_key(bubble_type: &str, window_id: Option<String>) -> String {
    let raw = window_id.unwrap_or_else(|| bubble_type.to_string());
    let cleaned: String = raw
        .chars()
        .filter(|value| value.is_ascii_alphanumeric() || *value == '-')
        .collect();

    if cleaned.is_empty() {
        bubble_type.to_string()
    } else {
        cleaned
    }
}

fn widget_window_label(widget: &WidgetWindowState) -> String {
    let window_key = widget.window_id.as_deref().unwrap_or(&widget.active_bubble);
    format!("{WIDGET_WINDOW_LABEL_PREFIX}-{window_key}")
}

fn is_widget_window_label(label: &str) -> bool {
    label.starts_with(&format!("{WIDGET_WINDOW_LABEL_PREFIX}-"))
}

fn widget_window_url(widget: &WidgetWindowState) -> String {
    let mut url = format!(
        "{WIDGET_WINDOW_URL}?bubble={}&mode={}",
        widget.active_bubble, widget.mode
    );

    if let Some(window_id) = &widget.window_id {
        url.push_str("&windowId=");
        url.push_str(window_id);
    }

    url
}

fn widget_window_size(widget: &WidgetWindowState) -> LogicalSize<f64> {
    if widget.active_bubble == "bar" {
        return LogicalSize::new(WIDGET_BAR_WIDTH, WIDGET_BAR_HEIGHT);
    }
    if widget.active_bubble == "menu" {
        return LogicalSize::new(WIDGET_MENU_SIZE, WIDGET_MENU_SIZE);
    }

    match widget.mode.as_str() {
        "MINIMIZED" => LogicalSize::new(WIDGET_MINIMIZED_WIDTH, WIDGET_MINIMIZED_HEIGHT),
        "GHOST" => LogicalSize::new(188.0, 188.0),
        _ => match widget.active_bubble.as_str() {
            "chat" => LogicalSize::new(336.0, 476.0),
            "agent" => LogicalSize::new(332.0, 444.0),
            "timer" => LogicalSize::new(324.0, 420.0),
            "resource" => LogicalSize::new(324.0, 340.0),
            "memo" => LogicalSize::new(308.0, 304.0),
            "schedule" => LogicalSize::new(324.0, 340.0),
            _ => LogicalSize::new(WIDGET_DEFAULT_WIDTH, WIDGET_DEFAULT_HEIGHT),
        },
    }
}

fn widget_keeps_webview_when_hidden(widget: &WidgetWindowState) -> bool {
    widget.active_bubble == "bar" || widget.active_bubble == "menu"
}

fn destroy_all_widget_windows(app: &AppHandle) {
    for (label, window) in app.webview_windows() {
        if is_widget_window_label(&label) {
            let _ = window.destroy();
        }
    }
}

fn qa_all_widget_windows_enabled() -> bool {
    matches!(
        env::var("BUBLI_TAURI_WIDGET_QA_ALL"),
        Ok(value) if matches!(value.as_str(), "1" | "true" | "TRUE" | "yes" | "YES")
    )
}

fn build_widget_qa_windows(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<WidgetState>();

    for bubble_type in QA_ALL_WIDGET_BUBBLES {
        let widget = {
            let mut guard = state
                .lock()
                .map_err(|_| "widget state lock failed".to_string())?;
            guard.active_bubble = bubble_type.to_string();
            let widget = guard
                .bubbles
                .entry(bubble_type.to_string())
                .or_insert_with(|| default_widget_window_state(bubble_type, Some(bubble_type.to_string())));
            widget.mode = "DEFAULT".to_string();
            widget.click_through = false;
            widget.dock_orb_visible = false;
            widget.window_visible = true;
            widget.clone()
        };

        build_widget_window(app, &widget)?;
    }

    eprintln!("opened QA widget windows: {:?}", QA_ALL_WIDGET_BUBBLES);
    Ok(())
}

fn apply_widget_window_state(
    app: &AppHandle,
    widget: &WidgetWindowState,
) -> Result<WidgetWindowState, String> {
    let label = widget_window_label(widget);

    if let Some(window) = app.get_webview_window(&label) {
        if !widget.window_visible && !widget_keeps_webview_when_hidden(widget) {
            window.destroy().map_err(|error| error.to_string())?;
            return Ok(widget.clone());
        }

        window
            .set_always_on_top(widget.always_on_top)
            .map_err(|error| error.to_string())?;
        window
            .set_ignore_cursor_events(widget.click_through)
            .map_err(|error| error.to_string())?;
        window
            .set_position(Position::Logical(LogicalPosition::new(
                widget.position.x as f64,
                widget.position.y as f64,
            )))
            .map_err(|error| error.to_string())?;

        window
            .set_size(Size::Logical(widget_window_size(widget)))
            .map_err(|error| error.to_string())?;
        window
            .set_background_color(Some(Color(0, 0, 0, 0)))
            .map_err(|error| error.to_string())?;

        if widget.window_visible {
            window.show().map_err(|error| error.to_string())?;
        } else {
            window.hide().map_err(|error| error.to_string())?;
        }
    }

    Ok(widget.clone())
}

fn build_widget_window(
    app: &AppHandle,
    widget: &WidgetWindowState,
) -> Result<WidgetWindowState, String> {
    let label = widget_window_label(widget);

    if let Some(window) = app.get_webview_window(&label) {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return apply_widget_window_state(app, widget);
    }

    let size = widget_window_size(widget);
    let window = WebviewWindowBuilder::new(
        app,
        label,
        WebviewUrl::App(widget_window_url(widget).into()),
    )
    .title("Bubli 버블")
    .inner_size(size.width, size.height)
    .min_inner_size(size.width, size.height)
    .max_inner_size(size.width, size.height)
    .position(widget.position.x as f64, widget.position.y as f64)
    .decorations(false)
    .transparent(true)
    .background_color(Color(0, 0, 0, 0))
    .shadow(false)
    .resizable(false)
    .always_on_top(widget.always_on_top)
    .skip_taskbar(true)
    .focused(false)
    .build()
    .map_err(|error| error.to_string())?;

    window
        .set_ignore_cursor_events(widget.click_through)
        .map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;
    apply_widget_window_state(app, widget)
}

#[tauri::command]
fn get_widget_window_state(
    state: tauri::State<'_, WidgetState>,
    input: Option<WidgetWindowTargetInput>,
) -> Result<WidgetWindowState, String> {
    let bubble_type = input.as_ref().and_then(|value| value.bubble_type.clone());
    let window_id = input.and_then(|value| value.window_id);
    with_widget_state(state, bubble_type, window_id, |_| {})
}

#[tauri::command]
fn get_widget_bar_items(state: tauri::State<'_, WidgetState>) -> Result<Vec<WidgetWindowState>, String> {
    let guard = state
        .lock()
        .map_err(|_| "widget state lock failed".to_string())?;
    let mut items: Vec<WidgetWindowState> = guard
        .bubbles
        .values()
        .filter(|widget| widget.active_bubble != "bar" && widget.mode == "MINIMIZED" && !widget.window_visible)
        .cloned()
        .collect();

    items.sort_by(|left, right| {
        let left_key = left.window_id.as_deref().unwrap_or(&left.active_bubble);
        let right_key = right.window_id.as_deref().unwrap_or(&right.active_bubble);
        left_key.cmp(right_key)
    });

    Ok(items)
}

#[tauri::command]
fn set_widget_window_mode(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: WidgetWindowModeInput,
) -> Result<WidgetWindowState, String> {
    let widget = with_widget_state(state, input.bubble_type, input.window_id, |widget| {
        widget.mode = normalize_widget_mode(input.mode);
        widget.click_through = widget.mode == "GHOST";
        widget.dock_orb_visible = false;
        widget.window_visible = widget.active_bubble == "bar" || widget.mode != "MINIMIZED";
    })?;
    apply_widget_window_state(&app, &widget)
}

#[tauri::command]
fn set_widget_window_position(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: WidgetWindowPositionInput,
) -> Result<WidgetWindowState, String> {
    let widget = with_widget_state(state, input.bubble_type, input.window_id, |widget| {
        widget.position = WidgetWindowPosition {
            x: input.x,
            y: input.y,
        };
    })?;
    apply_widget_window_state(&app, &widget)
}

#[tauri::command]
fn set_widget_always_on_top(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: WidgetBooleanInput,
) -> Result<WidgetWindowState, String> {
    let widget = with_widget_state(state, input.bubble_type, input.window_id, |widget| {
        widget.always_on_top = input.enabled;
    })?;
    apply_widget_window_state(&app, &widget)
}

#[tauri::command]
fn set_widget_click_through(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: WidgetBooleanInput,
) -> Result<WidgetWindowState, String> {
    let widget = with_widget_state(state, input.bubble_type, input.window_id, |widget| {
        widget.click_through = input.enabled;
    })?;
    apply_widget_window_state(&app, &widget)
}

#[tauri::command]
fn toggle_widget_dock_orb(
    state: tauri::State<'_, WidgetState>,
    input: Option<WidgetBooleanInput>,
) -> Result<WidgetWindowState, String> {
    let bubble_type = input.as_ref().and_then(|value| value.bubble_type.clone());
    let window_id = input.as_ref().and_then(|value| value.window_id.clone());
    with_widget_state(state, bubble_type, window_id, |widget| {
        widget.dock_orb_visible = input.map_or(!widget.dock_orb_visible, |value| value.enabled);
    })
}

#[tauri::command]
fn update_widget_tray_state(
    state: tauri::State<'_, WidgetState>,
    input: WidgetBooleanInput,
) -> Result<WidgetWindowState, String> {
    with_widget_state(state, input.bubble_type, input.window_id, |widget| {
        widget.tray_visible = input.enabled;
    })
}

#[tauri::command]
fn register_widget_shortcut(
    state: tauri::State<'_, WidgetState>,
    input: WidgetShortcutInput,
) -> Result<WidgetWindowState, String> {
    with_widget_state(state, None, None, |widget| {
        widget.shortcut = Some(input.shortcut);
    })
}

#[tauri::command]
fn open_widget_window(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: Option<WidgetWindowOpenInput>,
) -> Result<WidgetWindowState, String> {
    let bubble_type =
        normalize_bubble_type(input.as_ref().and_then(|value| value.bubble_type.clone()));
    let window_id = input.as_ref().and_then(|value| value.window_id.clone());
    let next_mode = input
        .and_then(|value| value.mode)
        .map(normalize_widget_mode)
        .unwrap_or_else(|| "DEFAULT".to_string());
    let widget = with_widget_state(state, Some(bubble_type), window_id, |widget| {
        widget.mode = next_mode.clone();
        widget.click_through = widget.mode == "GHOST";
        widget.dock_orb_visible = false;
        widget.window_visible = widget.active_bubble == "bar" || widget.mode != "MINIMIZED";
    })?;
    build_widget_window(&app, &widget)
}

#[tauri::command]
fn close_widget_window(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: Option<WidgetWindowTargetInput>,
) -> Result<WidgetWindowState, String> {
    let bubble_type = input.as_ref().and_then(|value| value.bubble_type.clone());
    let window_id = input.and_then(|value| value.window_id);
    let widget = with_widget_state(state, bubble_type, window_id, |widget| {
        widget.mode = "MINIMIZED".to_string();
        widget.click_through = false;
        widget.dock_orb_visible = false;
        widget.window_visible = false;
    })?;
    if widget_keeps_webview_when_hidden(&widget) {
        apply_widget_window_state(&app, &widget)
    } else {
        let label = widget_window_label(&widget);
        if let Some(window) = app.get_webview_window(&label) {
            window.destroy().map_err(|error| error.to_string())?;
        }
        Ok(widget)
    }
}

#[tauri::command]
fn toggle_widget_window(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: Option<WidgetWindowTargetInput>,
) -> Result<WidgetWindowState, String> {
    let bubble_type = input.as_ref().and_then(|value| value.bubble_type.clone());
    let window_id = input.and_then(|value| value.window_id);
    let widget = with_widget_state(state, bubble_type, window_id, |widget| {
        widget.window_visible = !widget.window_visible;
        widget.mode = if widget.window_visible {
            "DEFAULT".to_string()
        } else {
            "MINIMIZED".to_string()
        };
        widget.dock_orb_visible = false;
    })?;

    if widget.window_visible {
        build_widget_window(&app, &widget)
    } else {
        apply_widget_window_state(&app, &widget)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(WidgetWindowStore::default()))
        .setup(|app| {
            // Open the on-device SQLite store (folder index, widget usage,
            // activity focus, sync outbox) and expose it as managed state.
            let connection =
                local_db::open_and_migrate(app.handle()).map_err(|error| error.to_string())?;
            app.manage(local_db::Db(Mutex::new(connection)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_ready,
            close_widget_window,
            get_widget_bar_items,
            get_widget_window_state,
            open_widget_window,
            register_widget_shortcut,
            set_widget_always_on_top,
            set_widget_click_through,
            set_widget_window_mode,
            set_widget_window_position,
            toggle_widget_window,
            toggle_widget_dock_orb,
            update_widget_tray_state,
            // BUBLI-44 activity context
            activity::read_activity_context,
            // BUBLI-41 widget usage events + rollups + server-sync staging
            widget_usage::record_widget_usage_event,
            widget_usage::rollup_widget_usage,
            widget_usage::sync_widget_usage_summary,
            widget_usage::mark_widget_usage_summary_synced,
            // BUBLI-43 local file index + change events + sync outbox
            local_files::select_managed_folder,
            local_files::scan_managed_folder,
            local_files::watch_managed_folder,
            local_files::search_local_files,
            local_files::flush_sync_outbox,
            // Local SQLite lifecycle + cache recovery commands.
            local_db::backup_local_sqlite,
            local_db::check_local_sqlite_integrity,
            local_db::recover_timer_state,
            local_db::restore_local_sqlite_backup,
            local_db::sync_room_messages
        ])
        .build(tauri::generate_context!())
        .expect("failed to build Bubli Tauri application");

    app.run(|app_handle, event| {
        match event {
            tauri::RunEvent::Ready => {
                if qa_all_widget_windows_enabled() {
                    if let Err(error) = build_widget_qa_windows(app_handle) {
                        eprintln!("failed to open QA widget windows: {error}");
                    }
                }
            }
            tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
                destroy_all_widget_windows(app_handle);
            }
            _ => {}
        }
    });
}
