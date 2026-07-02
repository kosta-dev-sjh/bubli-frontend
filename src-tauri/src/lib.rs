use std::{collections::HashMap, env, fs, path::PathBuf, sync::Mutex};

use serde::{Deserialize, Serialize};
use tauri::utils::config::Color;
use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Monitor, Position, Size, WebviewUrl,
    WebviewWindowBuilder,
};

mod activity;
mod local_db;
mod local_files;
mod widget_usage;

const WIDGET_WINDOW_LABEL_PREFIX: &str = "bubli-widget";
const WIDGET_WINDOW_URL: &str = "desktop-widget";
const WIDGET_ROOM_CONTEXT_CHANGED_EVENT: &str = "bubli-widget-room-context-changed";
const MAIN_WINDOW_LABEL: &str = "main";
const MAIN_WINDOW_DEFAULT_WIDTH: i32 = 1280;
const MAIN_WINDOW_DEFAULT_HEIGHT: i32 = 820;
const DEFAULT_WIDGET_BUBBLE_TYPE: &str = "todo";
const WIDGET_DEFAULT_WIDTH: f64 = 324.0;
const WIDGET_DEFAULT_HEIGHT: f64 = 392.0;
const WIDGET_BAR_WIDTH: f64 = 360.0;
const WIDGET_BAR_HEIGHT: f64 = 168.0;
const WIDGET_MENU_SIZE: f64 = 192.0;
const WIDGET_MINIMIZED_WIDTH: f64 = 188.0;
const WIDGET_MINIMIZED_HEIGHT: f64 = 72.0;
const PRIMARY_MONITOR_ID: &str = "primary";
const QA_ALL_WIDGET_BUBBLES: [&str; 8] = [
    "todo", "agent", "chat", "timer", "memo", "schedule", "resource", "alert",
];

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct WidgetWindowPosition {
    x: i32,
    y: i32,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct WidgetWindowState {
    active_bubble: String,
    always_on_top: bool,
    click_through: bool,
    dock_orb_visible: bool,
    mode: String,
    position: WidgetWindowPosition,
    selected_room_id: Option<String>,
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

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredWidgetWindowLayout {
    active_bubble: String,
    bubbles: Vec<WidgetWindowState>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppMonitorPosition {
    x: i32,
    y: i32,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppMonitorSize {
    height: u32,
    width: u32,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppMonitorInfo {
    id: String,
    is_primary: bool,
    name: Option<String>,
    position: AppMonitorPosition,
    scale_factor: f64,
    size: AppMonitorSize,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppMonitorPreference {
    monitors: Vec<AppMonitorInfo>,
    preferred_monitor_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppMonitorPreferenceInput {
    monitor_id: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredAppMonitorPreference {
    preferred_monitor_id: String,
}

#[derive(Clone)]
struct AppMonitorPreferenceStore {
    preferred_monitor_id: String,
}

impl Default for AppMonitorPreferenceStore {
    fn default() -> Self {
        Self {
            preferred_monitor_id: PRIMARY_MONITOR_ID.to_string(),
        }
    }
}

type AppMonitorState = Mutex<AppMonitorPreferenceStore>;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetWindowModeInput {
    bubble_type: Option<String>,
    mode: String,
    selected_room_id: Option<String>,
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
    selected_room_id: Option<String>,
    window_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetRoomContextInput {
    selected_room_id: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WidgetRoomContextChangedPayload {
    selected_room_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppReadyInput {
    qa_all_widgets: Option<bool>,
    selected_room_id: Option<String>,
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
        selected_room_id: None,
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
    state: &WidgetState,
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

fn normalize_optional_query_value(value: Option<String>) -> Option<String> {
    value.and_then(|raw| {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
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

fn append_widget_url_query(url: &mut String, key: &str, value: &str) {
    url.push('&');
    url.push_str(key);
    url.push('=');
    for character in value.chars() {
        if character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.' | '~') {
            url.push(character);
        }
    }
}

fn widget_window_label(widget: &WidgetWindowState) -> String {
    let window_key = widget.window_id.as_deref().unwrap_or(&widget.active_bubble);
    format!("{WIDGET_WINDOW_LABEL_PREFIX}-{window_key}")
}

fn widget_window_layout_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("app_config_dir resolve failed: {error}"))?;
    Ok(dir.join("widget-window-layout.json"))
}

fn stored_widget_window_layout(store: &WidgetWindowStore) -> StoredWidgetWindowLayout {
    let mut bubbles: Vec<WidgetWindowState> = store.bubbles.values().cloned().collect();
    bubbles.sort_by(|left, right| {
        let left_key = left.window_id.as_deref().unwrap_or(&left.active_bubble);
        let right_key = right.window_id.as_deref().unwrap_or(&right.active_bubble);
        left_key.cmp(right_key)
    });

    StoredWidgetWindowLayout {
        active_bubble: store.active_bubble.clone(),
        bubbles,
    }
}

fn widget_window_store_from_layout(layout: StoredWidgetWindowLayout) -> WidgetWindowStore {
    let mut bubbles = HashMap::new();

    for mut widget in layout.bubbles {
        widget.active_bubble = normalize_bubble_type(Some(widget.active_bubble));
        widget.mode = normalize_widget_mode(widget.mode);
        widget.click_through = widget.click_through || widget.mode == "GHOST";
        if widget.active_bubble != "bar" && widget.mode == "MINIMIZED" {
            widget.window_visible = false;
        }
        let key = normalize_window_key(&widget.active_bubble, widget.window_id.clone());
        widget.window_id = Some(key.clone());
        bubbles.insert(key, widget);
    }

    let active_bubble = normalize_bubble_type(Some(layout.active_bubble));
    bubbles.entry(active_bubble.clone()).or_insert_with(|| {
        default_widget_window_state(&active_bubble, Some(active_bubble.clone()))
    });

    WidgetWindowStore {
        active_bubble,
        bubbles,
    }
}

fn load_widget_window_store(app: &AppHandle) -> Result<WidgetWindowStore, String> {
    let path = widget_window_layout_path(app)?;
    if !path.exists() {
        return Ok(WidgetWindowStore::default());
    }

    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let stored: StoredWidgetWindowLayout =
        serde_json::from_str(content.trim_start_matches('\u{feff}').trim())
            .map_err(|error| error.to_string())?;
    Ok(widget_window_store_from_layout(stored))
}

fn save_widget_window_layout(
    app: &AppHandle,
    layout: &StoredWidgetWindowLayout,
) -> Result<(), String> {
    let path = widget_window_layout_path(app)?;
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|error| error.to_string())?;
    }

    let content = serde_json::to_string_pretty(layout).map_err(|error| error.to_string())?;
    fs::write(path, content).map_err(|error| error.to_string())
}

fn persist_widget_window_state(app: &AppHandle, state: &WidgetState) -> Result<(), String> {
    let layout = {
        let guard = state
            .lock()
            .map_err(|_| "widget state lock failed".to_string())?;
        stored_widget_window_layout(&guard)
    };
    save_widget_window_layout(app, &layout)
}

fn remember_widget_window_absolute_position(
    app: &AppHandle,
    label: &str,
    absolute_x: i32,
    absolute_y: i32,
) -> Result<(), String> {
    if !is_widget_window_label(label) {
        return Ok(());
    }

    let monitor_state = app.state::<AppMonitorState>();
    let preferred_monitor_id = get_preferred_monitor_id(&monitor_state)?;
    let monitor = resolve_preferred_monitor(app, &preferred_monitor_id)?;
    let origin = monitor.as_ref().map(|monitor| monitor.position());
    let origin_x = origin.map_or(0, |position| position.x);
    let origin_y = origin.map_or(0, |position| position.y);
    let relative_x = absolute_x - origin_x;
    let relative_y = absolute_y - origin_y;

    let state = app.state::<WidgetState>();
    let layout = {
        let mut guard = state
            .lock()
            .map_err(|_| "widget state lock failed".to_string())?;
        let Some(widget) = guard
            .bubbles
            .values_mut()
            .find(|widget| widget_window_label(widget) == label)
        else {
            return Ok(());
        };

        widget.position = WidgetWindowPosition {
            x: relative_x,
            y: relative_y,
        };
        stored_widget_window_layout(&guard)
    };

    save_widget_window_layout(app, &layout)
}

fn widget_window_title(widget: &WidgetWindowState) -> &'static str {
    match widget.active_bubble.as_str() {
        "bar" => "Bubli widget bar",
        "menu" => "Bubli widget menu",
        _ => "Bubli widget",
    }
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
        append_widget_url_query(&mut url, "windowId", window_id);
    }

    if let Some(selected_room_id) = &widget.selected_room_id {
        append_widget_url_query(&mut url, "roomId", selected_room_id);
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

fn monitor_id(monitor: &Monitor, index: usize) -> String {
    monitor
        .name()
        .filter(|name| !name.trim().is_empty())
        .cloned()
        .unwrap_or_else(|| format!("monitor-{}", index + 1))
}

fn monitors_match(left: &Monitor, right: &Monitor) -> bool {
    left.name() == right.name()
        && left.position().x == right.position().x
        && left.position().y == right.position().y
        && left.size().width == right.size().width
        && left.size().height == right.size().height
}

fn app_monitor_info(monitor: &Monitor, index: usize, primary: Option<&Monitor>) -> AppMonitorInfo {
    AppMonitorInfo {
        id: monitor_id(monitor, index),
        is_primary: primary.is_some_and(|primary_monitor| monitors_match(monitor, primary_monitor)),
        name: monitor.name().cloned(),
        position: AppMonitorPosition {
            x: monitor.position().x,
            y: monitor.position().y,
        },
        scale_factor: monitor.scale_factor(),
        size: AppMonitorSize {
            height: monitor.size().height,
            width: monitor.size().width,
        },
    }
}

fn list_monitors(app: &AppHandle) -> Result<(Vec<Monitor>, Option<Monitor>), String> {
    let monitors = app
        .available_monitors()
        .map_err(|error| error.to_string())?;
    let primary = app.primary_monitor().map_err(|error| error.to_string())?;
    Ok((monitors, primary))
}

fn monitor_preference_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("app_config_dir resolve failed: {error}"))?;
    Ok(dir.join("monitor-preference.json"))
}

fn load_preferred_monitor_id(app: &AppHandle) -> Result<String, String> {
    let path = monitor_preference_path(app)?;
    if !path.exists() {
        return Ok(PRIMARY_MONITOR_ID.to_string());
    }

    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let stored: StoredAppMonitorPreference =
        serde_json::from_str(content.trim_start_matches('\u{feff}').trim())
            .map_err(|error| error.to_string())?;
    Ok(if stored.preferred_monitor_id.trim().is_empty() {
        PRIMARY_MONITOR_ID.to_string()
    } else {
        stored.preferred_monitor_id
    })
}

fn save_preferred_monitor_id(app: &AppHandle, preferred_monitor_id: &str) -> Result<(), String> {
    let path = monitor_preference_path(app)?;
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|error| error.to_string())?;
    }

    let payload = StoredAppMonitorPreference {
        preferred_monitor_id: preferred_monitor_id.to_string(),
    };
    let content = serde_json::to_string_pretty(&payload).map_err(|error| error.to_string())?;
    fs::write(path, content).map_err(|error| error.to_string())
}

fn get_preferred_monitor_id(state: &AppMonitorState) -> Result<String, String> {
    let guard = state
        .lock()
        .map_err(|_| "app monitor state lock failed".to_string())?;
    Ok(guard.preferred_monitor_id.clone())
}

fn monitor_preference_result(
    app: &AppHandle,
    preferred_monitor_id: String,
) -> Result<AppMonitorPreference, String> {
    let (monitors, primary) = list_monitors(app)?;
    let monitor_infos = monitors
        .iter()
        .enumerate()
        .map(|(index, monitor)| app_monitor_info(monitor, index, primary.as_ref()))
        .collect();

    Ok(AppMonitorPreference {
        monitors: monitor_infos,
        preferred_monitor_id,
    })
}

fn resolve_preferred_monitor(
    app: &AppHandle,
    preferred_monitor_id: &str,
) -> Result<Option<Monitor>, String> {
    let (monitors, primary) = list_monitors(app)?;
    if preferred_monitor_id == PRIMARY_MONITOR_ID {
        return Ok(primary.or_else(|| monitors.first().cloned()));
    }

    Ok(monitors
        .iter()
        .enumerate()
        .find(|(index, monitor)| monitor_id(monitor, *index) == preferred_monitor_id)
        .map(|(_, monitor)| monitor.clone())
        .or(primary)
        .or_else(|| monitors.first().cloned()))
}

fn widget_screen_position(
    app: &AppHandle,
    monitor_state: &AppMonitorState,
    widget: &WidgetWindowState,
) -> Result<LogicalPosition<f64>, String> {
    let preferred_monitor_id = get_preferred_monitor_id(monitor_state)?;
    let monitor = resolve_preferred_monitor(app, &preferred_monitor_id)?;
    let origin = monitor.as_ref().map(|monitor| monitor.position());
    let origin_x = origin.map_or(0, |position| position.x);
    let origin_y = origin.map_or(0, |position| position.y);

    Ok(LogicalPosition::new(
        (origin_x + widget.position.x) as f64,
        (origin_y + widget.position.y) as f64,
    ))
}

fn position_main_window_on_preferred_monitor(
    app: &AppHandle,
    monitor_state: &AppMonitorState,
) -> Result<(), String> {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return Ok(());
    };
    let preferred_monitor_id = get_preferred_monitor_id(monitor_state)?;
    let Some(monitor) = resolve_preferred_monitor(app, &preferred_monitor_id)? else {
        return Ok(());
    };
    let origin = monitor.position();
    let monitor_size = monitor.size();
    let window_size = window.outer_size().ok();
    let window_width = window_size
        .as_ref()
        .map(|size| size.width as i32)
        .unwrap_or(MAIN_WINDOW_DEFAULT_WIDTH);
    let window_height = window_size
        .as_ref()
        .map(|size| size.height as i32)
        .unwrap_or(MAIN_WINDOW_DEFAULT_HEIGHT);
    let x = origin.x + ((monitor_size.width as i32 - window_width).max(0) / 2);
    let y = origin.y + ((monitor_size.height as i32 - window_height).max(0) / 2);

    window
        .set_position(Position::Logical(LogicalPosition::new(x as f64, y as f64)))
        .map_err(|error| error.to_string())
}

fn widget_keeps_webview_when_hidden(widget: &WidgetWindowState) -> bool {
    widget.active_bubble == "bar" || widget.active_bubble == "menu"
}

fn set_widget_room_context_for_store(
    store: &mut WidgetWindowStore,
    selected_room_id: Option<String>,
) -> Vec<WidgetWindowState> {
    for widget in store.bubbles.values_mut() {
        widget.selected_room_id = selected_room_id.clone();
    }

    store.bubbles.values().cloned().collect()
}

fn destroy_all_widget_windows(app: &AppHandle) -> usize {
    let mut destroyed_count = 0;
    for (label, window) in app.webview_windows() {
        if is_widget_window_label(&label) {
            let _ = window.destroy();
            destroyed_count += 1;
        }
    }
    destroyed_count
}

fn qa_all_widget_windows_enabled() -> bool {
    matches!(
        env::var("BUBLI_TAURI_WIDGET_QA_ALL"),
        Ok(value) if matches!(value.as_str(), "1" | "true" | "TRUE" | "yes" | "YES")
    )
}

fn build_widget_qa_windows(
    app: &AppHandle,
    selected_room_id: Option<String>,
) -> Result<(), String> {
    let state = app.state::<WidgetState>();
    let monitor_state = app.state::<AppMonitorState>();

    for bubble_type in QA_ALL_WIDGET_BUBBLES {
        let widget = {
            let mut guard = state
                .lock()
                .map_err(|_| "widget state lock failed".to_string())?;
            guard.active_bubble = bubble_type.to_string();
            let widget = guard
                .bubbles
                .entry(bubble_type.to_string())
                .or_insert_with(|| {
                    default_widget_window_state(bubble_type, Some(bubble_type.to_string()))
                });
            widget.mode = "DEFAULT".to_string();
            widget.click_through = false;
            widget.dock_orb_visible = false;
            widget.selected_room_id = selected_room_id.clone();
            widget.window_visible = true;
            widget.clone()
        };

        build_widget_window(app, &monitor_state, &widget)?;
    }

    eprintln!("opened QA widget windows: {:?}", QA_ALL_WIDGET_BUBBLES);
    Ok(())
}

fn apply_widget_window_state(
    app: &AppHandle,
    monitor_state: &AppMonitorState,
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
            .set_position(Position::Logical(widget_screen_position(
                app,
                monitor_state,
                widget,
            )?))
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
    monitor_state: &AppMonitorState,
    widget: &WidgetWindowState,
) -> Result<WidgetWindowState, String> {
    let label = widget_window_label(widget);

    if let Some(window) = app.get_webview_window(&label) {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return apply_widget_window_state(app, monitor_state, widget);
    }

    let size = widget_window_size(widget);
    let position = widget_screen_position(app, monitor_state, widget)?;
    let window = WebviewWindowBuilder::new(
        app,
        label.clone(),
        WebviewUrl::App(widget_window_url(widget).into()),
    )
    .title(widget_window_title(widget))
    .inner_size(size.width, size.height)
    .min_inner_size(size.width, size.height)
    .max_inner_size(size.width, size.height)
    .position(position.x, position.y)
    .decorations(false)
    .transparent(true)
    .background_color(Color(0, 0, 0, 0))
    .shadow(true)
    .resizable(false)
    .always_on_top(widget.always_on_top)
    .skip_taskbar(true)
    .focused(false)
    .build()
    .map_err(|error| error.to_string())?;

    let app_for_move_event = app.clone();
    let label_for_move_event = label.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Moved(position) = event {
            if let Err(error) = remember_widget_window_absolute_position(
                &app_for_move_event,
                &label_for_move_event,
                position.x,
                position.y,
            ) {
                eprintln!("failed to persist widget window position: {error}");
            }
        }
    });

    window
        .set_ignore_cursor_events(widget.click_through)
        .map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;
    apply_widget_window_state(app, monitor_state, widget)
}

#[tauri::command]
fn get_widget_window_state(
    state: tauri::State<'_, WidgetState>,
    input: Option<WidgetWindowTargetInput>,
) -> Result<WidgetWindowState, String> {
    let bubble_type = input.as_ref().and_then(|value| value.bubble_type.clone());
    let window_id = input.and_then(|value| value.window_id);
    with_widget_state(&state, bubble_type, window_id, |_| {})
}

#[tauri::command]
fn get_widget_bar_items(
    state: tauri::State<'_, WidgetState>,
) -> Result<Vec<WidgetWindowState>, String> {
    let guard = state
        .lock()
        .map_err(|_| "widget state lock failed".to_string())?;
    let mut items: Vec<WidgetWindowState> = guard
        .bubbles
        .values()
        .filter(|widget| {
            widget.active_bubble != "bar" && widget.mode == "MINIMIZED" && !widget.window_visible
        })
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
fn close_all_widget_windows(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
) -> Result<usize, String> {
    {
        let mut guard = state
            .lock()
            .map_err(|_| "widget state lock failed".to_string())?;
        for widget in guard.bubbles.values_mut() {
            widget.mode = "MINIMIZED".to_string();
            widget.click_through = false;
            widget.dock_orb_visible = false;
            widget.window_visible = false;
        }
    }

    Ok(destroy_all_widget_windows(&app))
}

#[tauri::command]
fn get_preferred_app_monitor(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
) -> Result<AppMonitorPreference, String> {
    monitor_preference_result(&app, get_preferred_monitor_id(&monitor_state)?)
}

#[tauri::command]
fn list_app_monitors(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
) -> Result<AppMonitorPreference, String> {
    monitor_preference_result(&app, get_preferred_monitor_id(&monitor_state)?)
}

#[tauri::command]
fn set_preferred_app_monitor(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    input: AppMonitorPreferenceInput,
) -> Result<AppMonitorPreference, String> {
    let requested_monitor_id = if input.monitor_id.trim().is_empty() {
        PRIMARY_MONITOR_ID.to_string()
    } else {
        input.monitor_id
    };
    let (monitors, _primary) = list_monitors(&app)?;
    let monitor_exists = requested_monitor_id == PRIMARY_MONITOR_ID
        || monitors
            .iter()
            .enumerate()
            .any(|(index, monitor)| monitor_id(monitor, index) == requested_monitor_id);

    if !monitor_exists {
        return Err(format!("unknown monitor id: {requested_monitor_id}"));
    }

    save_preferred_monitor_id(&app, &requested_monitor_id)?;

    {
        let mut guard = monitor_state
            .lock()
            .map_err(|_| "app monitor state lock failed".to_string())?;
        guard.preferred_monitor_id = requested_monitor_id.clone();
    }

    position_main_window_on_preferred_monitor(&app, &monitor_state)?;

    let widgets: Vec<WidgetWindowState> = {
        let guard = state
            .lock()
            .map_err(|_| "widget state lock failed".to_string())?;
        guard.bubbles.values().cloned().collect()
    };

    for widget in widgets {
        apply_widget_window_state(&app, &monitor_state, &widget)?;
    }

    monitor_preference_result(&app, requested_monitor_id)
}

#[tauri::command]
fn set_widget_window_mode(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    input: WidgetWindowModeInput,
) -> Result<WidgetWindowState, String> {
    let WidgetWindowModeInput {
        bubble_type,
        mode,
        selected_room_id,
        window_id,
    } = input;
    let selected_room_id = normalize_optional_query_value(selected_room_id);
    let widget = with_widget_state(&state, bubble_type, window_id, |widget| {
        widget.mode = normalize_widget_mode(mode);
        widget.click_through = widget.mode == "GHOST";
        widget.dock_orb_visible = false;
        if selected_room_id.is_some() {
            widget.selected_room_id = selected_room_id.clone();
        }
        widget.window_visible = widget.active_bubble == "bar" || widget.mode != "MINIMIZED";
    })?;
    persist_widget_window_state(&app, &state)?;
    apply_widget_window_state(&app, &monitor_state, &widget)
}

#[tauri::command]
fn set_widget_window_position(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    input: WidgetWindowPositionInput,
) -> Result<WidgetWindowState, String> {
    let widget = with_widget_state(&state, input.bubble_type, input.window_id, |widget| {
        widget.position = WidgetWindowPosition {
            x: input.x,
            y: input.y,
        };
    })?;
    persist_widget_window_state(&app, &state)?;
    apply_widget_window_state(&app, &monitor_state, &widget)
}

#[tauri::command]
fn set_widget_room_context(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    input: WidgetRoomContextInput,
) -> Result<Vec<WidgetWindowState>, String> {
    let selected_room_id = normalize_optional_query_value(input.selected_room_id);
    let widgets = {
        let mut guard = state
            .lock()
            .map_err(|_| "widget state lock failed".to_string())?;
        set_widget_room_context_for_store(&mut guard, selected_room_id.clone())
    };
    let payload = WidgetRoomContextChangedPayload { selected_room_id };

    for widget in &widgets {
        apply_widget_window_state(&app, &monitor_state, widget)?;
        let label = widget_window_label(widget);
        if app.get_webview_window(&label).is_some() {
            let _ = app.emit_to(&label, WIDGET_ROOM_CONTEXT_CHANGED_EVENT, payload.clone());
        }
    }

    Ok(widgets)
}

#[tauri::command]
fn set_widget_always_on_top(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    input: WidgetBooleanInput,
) -> Result<WidgetWindowState, String> {
    let widget = with_widget_state(&state, input.bubble_type, input.window_id, |widget| {
        widget.always_on_top = input.enabled;
    })?;
    persist_widget_window_state(&app, &state)?;
    apply_widget_window_state(&app, &monitor_state, &widget)
}

#[tauri::command]
fn set_widget_click_through(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    input: WidgetBooleanInput,
) -> Result<WidgetWindowState, String> {
    let widget = with_widget_state(&state, input.bubble_type, input.window_id, |widget| {
        widget.click_through = input.enabled;
    })?;
    persist_widget_window_state(&app, &state)?;
    apply_widget_window_state(&app, &monitor_state, &widget)
}

#[tauri::command]
fn toggle_widget_dock_orb(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: Option<WidgetBooleanInput>,
) -> Result<WidgetWindowState, String> {
    let bubble_type = input.as_ref().and_then(|value| value.bubble_type.clone());
    let window_id = input.as_ref().and_then(|value| value.window_id.clone());
    let widget = with_widget_state(&state, bubble_type, window_id, |widget| {
        widget.dock_orb_visible = input.map_or(!widget.dock_orb_visible, |value| value.enabled);
    })?;
    persist_widget_window_state(&app, &state)?;
    Ok(widget)
}

#[tauri::command]
fn update_widget_tray_state(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: WidgetBooleanInput,
) -> Result<WidgetWindowState, String> {
    let widget = with_widget_state(&state, input.bubble_type, input.window_id, |widget| {
        widget.tray_visible = input.enabled;
    })?;
    persist_widget_window_state(&app, &state)?;
    Ok(widget)
}

#[tauri::command]
fn register_widget_shortcut(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: WidgetShortcutInput,
) -> Result<WidgetWindowState, String> {
    let widget = with_widget_state(&state, None, None, |widget| {
        widget.shortcut = Some(input.shortcut);
    })?;
    persist_widget_window_state(&app, &state)?;
    Ok(widget)
}

fn open_login_startup_widget(
    app: &AppHandle,
    monitor_state: &AppMonitorState,
    state: &WidgetState,
    bubble_type: &str,
    window_id: &str,
    selected_room_id: Option<String>,
) -> Result<WidgetWindowState, String> {
    let widget = {
        let mut guard = state
            .lock()
            .map_err(|_| "widget state lock failed".to_string())?;
        let target = normalize_bubble_type(Some(bubble_type.to_string()));
        let window_key = normalize_window_key(&target, Some(window_id.to_string()));
        guard.active_bubble = target.clone();
        let widget = guard
            .bubbles
            .entry(window_key.clone())
            .or_insert_with(|| default_widget_window_state(&target, Some(window_key)));
        widget.mode = "DEFAULT".to_string();
        widget.click_through = false;
        widget.dock_orb_visible = false;
        widget.selected_room_id = selected_room_id;
        widget.window_visible = true;
        widget.clone()
    };

    persist_widget_window_state(app, state)?;
    build_widget_window(app, monitor_state, &widget)
}

fn app_ready_qa_all_widgets_requested(input: &Option<AppReadyInput>) -> bool {
    input
        .as_ref()
        .and_then(|value| value.qa_all_widgets)
        .unwrap_or(false)
}

#[tauri::command]
fn app_ready(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    input: Option<AppReadyInput>,
) -> Result<&'static str, String> {
    let qa_all_widgets = app_ready_qa_all_widgets_requested(&input);
    let selected_room_id =
        input.and_then(|value| normalize_optional_query_value(value.selected_room_id));
    if qa_all_widgets && qa_all_widget_windows_enabled() {
        build_widget_qa_windows(&app, selected_room_id)?;
        return Ok("bubli-tauri-ready");
    }

    let bar_result = open_login_startup_widget(
        &app,
        &monitor_state,
        &state,
        "bar",
        "bar",
        selected_room_id.clone(),
    );
    let default_result = open_login_startup_widget(
        &app,
        &monitor_state,
        &state,
        DEFAULT_WIDGET_BUBBLE_TYPE,
        DEFAULT_WIDGET_BUBBLE_TYPE,
        selected_room_id,
    );

    let bar_error = bar_result.as_ref().err().map(ToString::to_string);
    let default_error = default_result.as_ref().err().map(ToString::to_string);

    if let Some(error) = &bar_error {
        eprintln!("failed to open login startup widget bar: {error}");
    }
    if let Some(error) = &default_error {
        eprintln!("failed to open login startup default widget: {error}");
    }
    if bar_error.is_some() || default_error.is_some() {
        return Err(format!(
            "failed to open login startup widgets: bar={}; default={}",
            bar_error.unwrap_or_else(|| "ok".to_string()),
            default_error.unwrap_or_else(|| "ok".to_string())
        ));
    }

    Ok("bubli-tauri-ready")
}

#[tauri::command]
fn open_widget_window(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    input: Option<WidgetWindowOpenInput>,
) -> Result<WidgetWindowState, String> {
    let bubble_type =
        normalize_bubble_type(input.as_ref().and_then(|value| value.bubble_type.clone()));
    let window_id = input.as_ref().and_then(|value| value.window_id.clone());
    let selected_room_id = normalize_optional_query_value(
        input
            .as_ref()
            .and_then(|value| value.selected_room_id.clone()),
    );
    let next_mode = input
        .and_then(|value| value.mode)
        .map(normalize_widget_mode)
        .unwrap_or_else(|| "DEFAULT".to_string());
    let widget = with_widget_state(&state, Some(bubble_type), window_id, |widget| {
        widget.mode = next_mode.clone();
        widget.click_through = widget.mode == "GHOST";
        widget.dock_orb_visible = false;
        if selected_room_id.is_some() {
            widget.selected_room_id = selected_room_id.clone();
        }
        widget.window_visible = widget.active_bubble == "bar" || widget.mode != "MINIMIZED";
    })?;
    persist_widget_window_state(&app, &state)?;
    build_widget_window(&app, &monitor_state, &widget)
}

#[tauri::command]
fn close_widget_window(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    input: Option<WidgetWindowTargetInput>,
) -> Result<WidgetWindowState, String> {
    let bubble_type = input.as_ref().and_then(|value| value.bubble_type.clone());
    let window_id = input.and_then(|value| value.window_id);
    let widget = with_widget_state(&state, bubble_type, window_id, |widget| {
        widget.mode = "MINIMIZED".to_string();
        widget.click_through = false;
        widget.dock_orb_visible = false;
        widget.window_visible = false;
    })?;
    persist_widget_window_state(&app, &state)?;
    if widget_keeps_webview_when_hidden(&widget) {
        apply_widget_window_state(&app, &monitor_state, &widget)
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
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    input: Option<WidgetWindowTargetInput>,
) -> Result<WidgetWindowState, String> {
    let bubble_type = input.as_ref().and_then(|value| value.bubble_type.clone());
    let window_id = input.and_then(|value| value.window_id);
    let widget = with_widget_state(&state, bubble_type, window_id, |widget| {
        widget.window_visible = !widget.window_visible;
        widget.mode = if widget.window_visible {
            "DEFAULT".to_string()
        } else {
            "MINIMIZED".to_string()
        };
        widget.dock_orb_visible = false;
    })?;
    persist_widget_window_state(&app, &state)?;

    if widget.window_visible {
        build_widget_window(&app, &monitor_state, &widget)
    } else {
        apply_widget_window_state(&app, &monitor_state, &widget)
    }
}

#[cfg(test)]
mod tests {
    use super::{
        stored_widget_window_layout, widget_window_store_from_layout, StoredWidgetWindowLayout,
        WidgetWindowPosition, WidgetWindowState, WidgetWindowStore,
    };
    use std::collections::HashMap;

    fn widget(active_bubble: &str, window_id: Option<&str>, x: i32, y: i32) -> WidgetWindowState {
        WidgetWindowState {
            active_bubble: active_bubble.to_string(),
            always_on_top: true,
            click_through: false,
            dock_orb_visible: false,
            mode: "DEFAULT".to_string(),
            position: WidgetWindowPosition { x, y },
            selected_room_id: None,
            shortcut: Some("CommandOrControl+Shift+B".to_string()),
            tray_visible: true,
            window_id: window_id.map(str::to_string),
            window_visible: true,
        }
    }

    #[test]
    fn widget_layout_restore_keeps_saved_position_and_normalizes_window_key() {
        let store = widget_window_store_from_layout(StoredWidgetWindowLayout {
            active_bubble: "timer".to_string(),
            bubbles: vec![widget("timer", Some("timer*bad"), 144, 188)],
        });

        assert_eq!(store.active_bubble, "timer");
        let restored = store.bubbles.get("timerbad").expect("normalized widget");
        assert_eq!(restored.active_bubble, "timer");
        assert_eq!(restored.window_id.as_deref(), Some("timerbad"));
        assert_eq!(restored.position.x, 144);
        assert_eq!(restored.position.y, 188);
    }

    #[test]
    fn stored_widget_layout_is_sorted_for_stable_config_writes() {
        let mut bubbles = HashMap::new();
        bubbles.insert("timer".to_string(), widget("timer", Some("timer"), 10, 10));
        bubbles.insert("bar".to_string(), widget("bar", Some("bar"), 20, 20));
        let store = WidgetWindowStore {
            active_bubble: "timer".to_string(),
            bubbles,
        };

        let stored = stored_widget_window_layout(&store);

        let keys: Vec<&str> = stored
            .bubbles
            .iter()
            .map(|widget| widget.window_id.as_deref().unwrap_or(&widget.active_bubble))
            .collect();
        assert_eq!(keys, vec!["bar", "timer"]);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(AppMonitorPreferenceStore::default()))
        .manage(Mutex::new(WidgetWindowStore::default()))
        .manage(local_files::ManagedFolderWatchers::default())
        .setup(|app| {
            // Open the on-device SQLite store (folder index, widget usage,
            // activity focus, sync outbox) and expose it as managed state.
            let connection =
                local_db::open_and_migrate(app.handle()).map_err(|error| error.to_string())?;
            app.manage(local_db::Db(Mutex::new(connection)));

            match load_preferred_monitor_id(app.handle()) {
                Ok(preferred_monitor_id) => {
                    let monitor_state = app.state::<AppMonitorState>();
                    let mut guard = monitor_state
                        .lock()
                        .map_err(|_| "app monitor state lock failed".to_string())?;
                    guard.preferred_monitor_id = preferred_monitor_id;
                }
                Err(error) => {
                    eprintln!("failed to load monitor preference: {error}");
                }
            }
            match load_widget_window_store(app.handle()) {
                Ok(store) => {
                    let state = app.state::<WidgetState>();
                    let mut guard = state
                        .lock()
                        .map_err(|_| "widget state lock failed".to_string())?;
                    *guard = store;
                }
                Err(error) => {
                    eprintln!("failed to load widget window layout: {error}");
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_ready,
            close_all_widget_windows,
            close_widget_window,
            get_widget_bar_items,
            get_preferred_app_monitor,
            get_widget_window_state,
            list_app_monitors,
            open_widget_window,
            register_widget_shortcut,
            set_preferred_app_monitor,
            set_widget_always_on_top,
            set_widget_click_through,
            set_widget_room_context,
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
            local_files::list_managed_folders,
            local_files::select_managed_folder,
            local_files::get_index_progress,
            local_files::set_folder_sync,
            local_files::remove_managed_folder,
            local_files::scan_managed_folder,
            local_files::watch_managed_folder,
            local_files::search_local_files,
            local_files::read_local_file_preview,
            local_files::open_local_file,
            local_files::reindex_file,
            local_files::flush_sync_outbox,
            local_files::stage_local_file_events_for_sync,
            local_files::mark_local_file_events_synced,
            local_files::unwatch_all_managed_folders,
            local_files::watch_all_managed_folders,
            // Local SQLite lifecycle + cache recovery commands.
            local_db::backup_local_sqlite,
            local_db::check_local_sqlite_integrity,
            local_db::clear_active_project_room,
            local_db::clear_tauri_auth_session,
            local_db::list_local_sqlite_backups,
            local_db::mark_activity_context_synced,
            local_db::read_active_project_room,
            local_db::read_tauri_auth_session,
            local_db::read_widget_summary_cache,
            local_db::record_activity_context,
            local_db::record_timer_state,
            local_db::recover_timer_state,
            local_db::read_room_messages,
            local_db::stage_activity_contexts_for_sync,
            local_db::store_active_project_room,
            local_db::store_tauri_auth_session,
            local_db::store_widget_summary_cache,
            local_db::restore_local_sqlite_backup,
            local_db::sync_room_messages
        ])
        .build(tauri::generate_context!())
        .expect("failed to build Bubli Tauri application");

    app.run(|app_handle, event| match event {
        tauri::RunEvent::Ready => {
            let monitor_state = app_handle.state::<AppMonitorState>();
            if let Err(error) =
                position_main_window_on_preferred_monitor(app_handle, &monitor_state)
            {
                eprintln!("failed to position main window on preferred monitor: {error}");
            }
        }
        tauri::RunEvent::WindowEvent { label, event, .. }
            if label == MAIN_WINDOW_LABEL
                && matches!(
                    event,
                    tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed
                ) =>
        {
            destroy_all_widget_windows(app_handle);
            app_handle.exit(0);
        }
        tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
            let state = app_handle.state::<WidgetState>();
            if let Err(error) = persist_widget_window_state(app_handle, &state) {
                eprintln!("failed to persist widget window layout on exit: {error}");
            }
            let _ = destroy_all_widget_windows(app_handle);
        }
        _ => {}
    });
}

#[cfg(test)]
mod widget_runtime_tests {
    use super::*;

    #[test]
    fn widget_room_context_updates_all_known_widgets_and_can_clear_room() {
        let mut store = WidgetWindowStore::default();
        store.bubbles.insert(
            "bar".to_string(),
            default_widget_window_state("bar", Some("bar".to_string())),
        );
        store.bubbles.insert(
            "chat".to_string(),
            default_widget_window_state("chat", Some("chat".to_string())),
        );

        let selected = set_widget_room_context_for_store(&mut store, Some("room-1".to_string()));

        assert_eq!(selected.len(), 3);
        assert!(selected
            .iter()
            .all(|widget| widget.selected_room_id.as_deref() == Some("room-1")));

        let cleared = set_widget_room_context_for_store(&mut store, None);

        assert!(cleared
            .iter()
            .all(|widget| widget.selected_room_id.as_deref().is_none()));
    }

    #[test]
    fn app_ready_keeps_qa_all_widgets_off_unless_explicitly_requested() {
        assert!(!app_ready_qa_all_widgets_requested(&None));
        assert!(!app_ready_qa_all_widgets_requested(&Some(AppReadyInput {
            qa_all_widgets: None,
            selected_room_id: Some("room-1".to_string()),
        })));
        assert!(!app_ready_qa_all_widgets_requested(&Some(AppReadyInput {
            qa_all_widgets: Some(false),
            selected_room_id: None,
        })));
        assert!(app_ready_qa_all_widgets_requested(&Some(AppReadyInput {
            qa_all_widgets: Some(true),
            selected_room_id: None,
        })));
    }
}
