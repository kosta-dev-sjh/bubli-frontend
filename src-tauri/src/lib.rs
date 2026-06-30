use std::{collections::HashMap, sync::Mutex};

use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Manager, PhysicalPosition, PhysicalSize, Position, Size, WebviewUrl,
    WebviewWindowBuilder,
};

const WIDGET_WINDOW_LABEL_PREFIX: &str = "bubli-widget";
const WIDGET_WINDOW_URL: &str = "desktop-widget";
const DEFAULT_WIDGET_BUBBLE_TYPE: &str = "todo";

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
    window_visible: bool,
}

impl Default for WidgetWindowState {
    fn default() -> Self {
        default_widget_window_state(DEFAULT_WIDGET_BUBBLE_TYPE)
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
            default_widget_window_state(&active_bubble),
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
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetWindowPositionInput {
    bubble_type: Option<String>,
    x: i32,
    y: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetWindowOpenInput {
    bubble_type: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetWindowTargetInput {
    bubble_type: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetBooleanInput {
    bubble_type: Option<String>,
    enabled: bool,
}

#[derive(Deserialize)]
struct WidgetShortcutInput {
    shortcut: String,
}

fn default_widget_window_state(bubble_type: &str) -> WidgetWindowState {
    let offset = match bubble_type {
        "agent" => 28,
        "chat" => 56,
        "timer" => 84,
        "memo" => 112,
        "schedule" => 140,
        "resource" => 168,
        "alert" => 196,
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
        window_visible: false,
    }
}

fn resolve_target_bubble(store: &WidgetWindowStore, requested: Option<String>) -> String {
    requested.unwrap_or_else(|| store.active_bubble.clone())
}

fn with_widget_state(
    state: tauri::State<'_, WidgetState>,
    bubble_type: Option<String>,
    update: impl FnOnce(&mut WidgetWindowState),
) -> Result<WidgetWindowState, String> {
    let mut guard = state
        .lock()
        .map_err(|_| "widget state lock failed".to_string())?;
    let target = normalize_bubble_type(Some(resolve_target_bubble(&guard, bubble_type)));
    guard.active_bubble = target.clone();
    let widget = guard
        .bubbles
        .entry(target.clone())
        .or_insert_with(|| default_widget_window_state(&target));
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

fn widget_window_label(bubble_type: &str) -> String {
    format!("{WIDGET_WINDOW_LABEL_PREFIX}-{bubble_type}")
}

fn widget_window_url(bubble_type: &str) -> String {
    format!("{WIDGET_WINDOW_URL}?bubble={bubble_type}")
}

fn apply_widget_window_state(
    app: &AppHandle,
    widget: &WidgetWindowState,
) -> Result<WidgetWindowState, String> {
    let label = widget_window_label(&widget.active_bubble);

    if let Some(window) = app.get_webview_window(&label) {
        window
            .set_always_on_top(widget.always_on_top)
            .map_err(|error| error.to_string())?;
        window
            .set_ignore_cursor_events(widget.click_through)
            .map_err(|error| error.to_string())?;
        window
            .set_position(Position::Physical(PhysicalPosition::new(
                widget.position.x,
                widget.position.y,
            )))
            .map_err(|error| error.to_string())?;

        if widget.mode == "MINIMIZED" {
            window
                .set_size(Size::Physical(PhysicalSize::new(250, 110)))
                .map_err(|error| error.to_string())?;
        } else {
            window
                .set_size(Size::Physical(PhysicalSize::new(360, 520)))
                .map_err(|error| error.to_string())?;
        }

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
    let label = widget_window_label(&widget.active_bubble);

    if let Some(window) = app.get_webview_window(&label) {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return apply_widget_window_state(app, widget);
    }

    let window = WebviewWindowBuilder::new(
        app,
        label,
        WebviewUrl::App(widget_window_url(&widget.active_bubble).into()),
    )
    .title("Bubli 버블")
    .inner_size(360.0, 520.0)
    .min_inner_size(300.0, 260.0)
    .position(widget.position.x as f64, widget.position.y as f64)
    .decorations(false)
    .shadow(true)
    .resizable(true)
    .always_on_top(widget.always_on_top)
    .skip_taskbar(true)
    .focused(false)
    .build()
    .map_err(|error| error.to_string())?;

    window
        .set_ignore_cursor_events(widget.click_through)
        .map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;
    Ok(widget.clone())
}

#[tauri::command]
fn get_widget_window_state(
    state: tauri::State<'_, WidgetState>,
    input: Option<WidgetWindowTargetInput>,
) -> Result<WidgetWindowState, String> {
    let mut guard = state
        .lock()
        .map_err(|_| "widget state lock failed".to_string())?;
    let target = normalize_bubble_type(Some(resolve_target_bubble(
        &guard,
        input.and_then(|value| value.bubble_type),
    )));
    guard.active_bubble = target.clone();
    let widget = guard
        .bubbles
        .entry(target.clone())
        .or_insert_with(|| default_widget_window_state(&target));
    Ok(widget.clone())
}

#[tauri::command]
fn set_widget_window_mode(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: WidgetWindowModeInput,
) -> Result<WidgetWindowState, String> {
    let widget = with_widget_state(state, input.bubble_type, |widget| {
        widget.mode = normalize_widget_mode(input.mode);
        widget.click_through = widget.mode == "GHOST";
        widget.dock_orb_visible = widget.mode == "MINIMIZED";
        widget.window_visible = true;
    })?;
    apply_widget_window_state(&app, &widget)
}

#[tauri::command]
fn set_widget_window_position(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: WidgetWindowPositionInput,
) -> Result<WidgetWindowState, String> {
    let widget = with_widget_state(state, input.bubble_type, |widget| {
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
    let widget = with_widget_state(state, input.bubble_type, |widget| {
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
    let widget = with_widget_state(state, input.bubble_type, |widget| {
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
    with_widget_state(state, bubble_type, |widget| {
        widget.dock_orb_visible = input.map_or(!widget.dock_orb_visible, |value| value.enabled);
    })
}

#[tauri::command]
fn update_widget_tray_state(
    state: tauri::State<'_, WidgetState>,
    input: WidgetBooleanInput,
) -> Result<WidgetWindowState, String> {
    with_widget_state(state, input.bubble_type, |widget| {
        widget.tray_visible = input.enabled;
    })
}

#[tauri::command]
fn register_widget_shortcut(
    state: tauri::State<'_, WidgetState>,
    input: WidgetShortcutInput,
) -> Result<WidgetWindowState, String> {
    with_widget_state(state, None, |widget| {
        widget.shortcut = Some(input.shortcut);
    })
}

#[tauri::command]
fn open_widget_window(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: Option<WidgetWindowOpenInput>,
) -> Result<WidgetWindowState, String> {
    let bubble_type = normalize_bubble_type(input.and_then(|value| value.bubble_type));
    let widget = with_widget_state(state, Some(bubble_type), |widget| {
        widget.mode = "DEFAULT".to_string();
        widget.dock_orb_visible = false;
        widget.window_visible = true;
    })?;
    build_widget_window(&app, &widget)
}

#[tauri::command]
fn close_widget_window(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: Option<WidgetWindowTargetInput>,
) -> Result<WidgetWindowState, String> {
    let widget = with_widget_state(state, input.and_then(|value| value.bubble_type), |widget| {
        widget.mode = "MINIMIZED".to_string();
        widget.click_through = false;
        widget.dock_orb_visible = true;
        widget.window_visible = false;
    })?;
    apply_widget_window_state(&app, &widget)
}

#[tauri::command]
fn toggle_widget_window(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: Option<WidgetWindowTargetInput>,
) -> Result<WidgetWindowState, String> {
    let widget = with_widget_state(state, input.and_then(|value| value.bubble_type), |widget| {
        widget.window_visible = !widget.window_visible;
        widget.mode = if widget.window_visible {
            "DEFAULT".to_string()
        } else {
            "MINIMIZED".to_string()
        };
        widget.dock_orb_visible = !widget.window_visible;
    })?;

    if widget.window_visible {
        build_widget_window(&app, &widget)
    } else {
        apply_widget_window_state(&app, &widget)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(WidgetWindowStore::default()))
        .invoke_handler(tauri::generate_handler![
            app_ready,
            close_widget_window,
            get_widget_window_state,
            open_widget_window,
            register_widget_shortcut,
            set_widget_always_on_top,
            set_widget_click_through,
            set_widget_window_mode,
            set_widget_window_position,
            toggle_widget_window,
            toggle_widget_dock_orb,
            update_widget_tray_state
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Bubli Tauri application");
}
