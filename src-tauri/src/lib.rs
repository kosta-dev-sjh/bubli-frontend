use std::{
    collections::{hash_map::Entry, HashMap, HashSet},
    env, fs,
    io::{Read, Write},
    net::TcpListener,
    path::PathBuf,
    sync::{LazyLock, Mutex},
    thread,
    time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};
use tauri::utils::config::Color;
use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Monitor, PhysicalPosition, Position,
    Size, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

mod activity;
mod local_db;
mod local_files;
mod widget_usage;

const WIDGET_WINDOW_LABEL_PREFIX: &str = "bubli-widget";
const WIDGET_WINDOW_URL: &str = "desktop-widget/";
const WIDGET_ROOM_CONTEXT_CHANGED_EVENT: &str = "bubli-widget-room-context-changed";
const MAIN_WINDOW_LABEL: &str = "main";
const MAIN_WINDOW_DEFAULT_WIDTH: i32 = 1280;
const MAIN_WINDOW_DEFAULT_HEIGHT: i32 = 820;
const TAURI_OAUTH_LOOPBACK_BIND: &str = "127.0.0.1:3791";
const TAURI_OAUTH_LOOPBACK_PATH: &str = "/auth/callback";
const TAURI_OAUTH_LOOPBACK_TIMEOUT_MS: u64 = 120_000;
const DEFAULT_WIDGET_BUBBLE_TYPE: &str = "todo";
const WIDGET_DEFAULT_WIDTH: f64 = 324.0;
const WIDGET_DEFAULT_HEIGHT: f64 = 360.0;
const WIDGET_WINDOW_GUTTER: f64 = 44.0;
// 바 창은 pill(하단 고정 64px)만 시각적으로 유지한다. Bubli 메뉴는 바 창 안에서
// 브랜드 칩이 pill 위 투명 영역으로 morph해 열리는 인라인 패널이다(별도 menu 창 자동 실행 없음).
// 창 높이는 pill 위 hover 요약 팝오버 + 메뉴 패널(280×≈532, bottom 68px 앵커)이 들어갈
// 투명 여유를 포함한다 — desktop-widget-bubble.module.css .barRoot/.barPopover/.barMenuPanel과
// 동기화한다(68 + 532 + hover/그림자 여유 ≈ 640).
// 창 너비는 최악 조합(고정 알림 칩 + 구분선 + 브랜드 버블 마크 + 접힌 칩 7개, 타이머 칩은
// 시간 텍스트 포함)이 전부 들어가는 640 고정이다. 계산: 36px 칩 8개 + 타이머 시간 텍스트(~78px)
// + gap 6×9 + pill 패딩/보더 ≈ 460px < 640. "+N" 접기와 잘림이 어떤 조합에서도 없다.
// macOS에서 resizable(false) 창의 min/max 재조정 기반 라이브 리사이즈가 조용히 실패해
// 칩이 잘렸으므로, 바 창 리사이즈 자체를 없앴다. pill은 fit-content 폭으로 창 하단 중앙에
// 붙고(desktop-widget-bubble.module.css .barRoot), pill 밖 투명 영역은 커서 폴러가 클릭
// 통과시키므로 창이 커도 무해하다.
const WIDGET_BAR_WIDTH: f64 = 640.0;
const WIDGET_BAR_HEIGHT: f64 = 640.0;
// 바 창은 투명 여유를 포함하므로 native top-left가 화면 밖으로 일부 나갈 수 있다.
// 그래도 복원 시 사용자가 찾을 수 있도록 최소한 이 폭만큼은 선호 모니터 안에 남긴다.
#[cfg(target_os = "macos")]
const WIDGET_BAR_MIN_VISIBLE_WIDTH: f64 = 320.0;
// desktop-widget-bubble.module.css .bubbleBar 높이(칩 36 + padding 16 + border 2)와
// .barRoot padding 4를 합친 보이는 pill의 대략적 세로 예산.
const WIDGET_BAR_VISIBLE_HEIGHT: f64 = 58.0;
const WIDGET_BAR_ROOT_PADDING: f64 = 4.0;
// 일부 macOS/Tauri 조합에서는 monitor.work_area()가 Dock 영역을 충분히 제외하지 못한다.
// 이때만 하단에 보수적인 안전 여백을 둬 bar pill이 Dock 아래로 사라지지 않게 한다.
#[cfg(target_os = "macos")]
const WIDGET_MACOS_DOCK_GUARD: f64 = 92.0;
// 직전 릴리스의 바 창 높이. 저장 레이아웃에 barLayoutHeight가 없으면 이 값으로 간주하고,
// 바 pill이 창 하단 고정이므로 높이 델타만큼 저장 y를 위로 당겨 pill의 화면 위치를 유지한다.
const WIDGET_BAR_LEGACY_HEIGHT: f64 = 220.0;
// (deprecated) 메뉴 창: Bubli 메뉴가 바 인라인 패널로 통합되면서 로그인 자동 실행 목록에서
// 빠졌다. ?bubble=menu 창을 수동으로 열면 기존 크기/동작이 그대로 유지된다.
const WIDGET_MENU_WIDTH: f64 = 248.0;
// 메뉴 패널이 개인/룸 컨텍스트 행 + 8개 버블(1열) + 액션까지 담도록 높이를 넉넉히.
// 닫힘 상태(오브만)에서는 그림자를 껐고 투명 영역이라 큰 창이 보이지 않는다.
const WIDGET_MENU_HEIGHT: f64 = 540.0;
const ONBOARDING_OVERLAY_WINDOW_LABEL: &str = "onboarding-overlay";
#[cfg(target_os = "macos")]
const ONBOARDING_OVERLAY_WINDOW_URL: &str = "desktop-widget/onboarding/";
const WIDGET_MINIMIZED_WIDTH: f64 = 188.0;
const WIDGET_MINIMIZED_HEIGHT: f64 = 72.0;
const PRIMARY_MONITOR_ID: &str = "primary";
// 저장된 위치가 아직 없는 창의 좌표 센티널. 실제 좌표는 widget_screen_position이
// 모니터 크기 기준 기본 자리(바=하단 중앙, 메뉴=하단 중앙 위, 버블=우상단 24px 계단)로 계산한다.
const WIDGET_POSITION_UNSET: i32 = i32::MIN;
const WIDGET_DEFAULT_MARGIN: f64 = 24.0;
// 모니터 정보를 얻지 못했을 때 기본 자리 계산에 쓰는 보수적 화면 크기(논리 px).
const WIDGET_FALLBACK_MONITOR_WIDTH: f64 = 1440.0;
const WIDGET_FALLBACK_MONITOR_HEIGHT: f64 = 900.0;
// 위젯 창은 보이는 콘텐츠(pill/셸/팝오버)보다 큰 투명 사각형이다. set_ignore_cursor_events는
// 전부-아니면-전무이고 켜 두면 재진입 이벤트도 막히므로, 커서 폴링으로 콘텐츠 rect 안팎을
// 판정해 투명 영역 클릭만 아래 앱으로 통과시킨다(macOS/Windows 공통 패턴).
const WIDGET_POINTER_POLL_INTERVAL_MS: u64 = 80;
const WIDGET_POINTER_RECT_PADDING: f64 = 4.0;
const WIDGET_POINTER_WINDOW_BOUNDS_TOLERANCE: f64 = 32.0;
// 드래그(data-tauri-drag-region) 직후 Moved 이벤트가 이 시간 안에 있으면 통과를 켜지 않는다.
const WIDGET_POINTER_DRAG_GRACE_MS: u128 = 400;
// 웹뷰가 상호작용 표면 위에서 실제 마우스 이벤트를 받았다는 힌트가 이 시간 안에 있으면,
// Retina 배율/좌표 드리프트로 rect 판정이 어긋나도 클릭 가능(통과 꺼짐)을 유지한다.
const WIDGET_POINTER_SEEN_GRACE_MS: u128 = 500;
const QA_ALL_WIDGET_BUBBLES: [&str; 7] = [
    "todo", "agent", "chat", "timer", "memo", "schedule", "alert",
];
// 사용자 크기 조절 클램프: 버블별 최소 = 현재 기본 크기, 최대 = 최소 × 1.6.
// src/features/widget/components/desktop-widget-bubble.tsx 리사이즈 핸들과 동기화한다.
const WIDGET_USER_SIZE_MAX_SCALE: f64 = 1.6;
// 버블 자동 정렬(arrange_widget_windows): 우상단 앵커, 24px 간격, 한 열에 2개.
const WIDGET_ARRANGE_GAP: f64 = 24.0;
const WIDGET_ARRANGE_ROWS_PER_COLUMN: usize = 2;

// 사용자가 리사이즈로 정한 버블별 창 크기(논리 px). 시작 시 SQLite
// local_widget_bubble_sizes에서 로드하고, resize_widget_window가 갱신한다.
// widget_window_size가 DEFAULT/TRANSLUCENT 버블 창에 한해 기본 크기 대신 이 값을 쓴다.
static WIDGET_USER_SIZES: LazyLock<Mutex<HashMap<String, (f64, f64)>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn widget_user_size_override(bubble_type: &str) -> Option<LogicalSize<f64>> {
    let sizes = WIDGET_USER_SIZES.lock().ok()?;
    sizes
        .get(bubble_type)
        .map(|(width, height)| LogicalSize::new(*width, *height))
}

fn remember_widget_user_size(bubble_type: &str, size: &LogicalSize<f64>) {
    if let Ok(mut sizes) = WIDGET_USER_SIZES.lock() {
        sizes.insert(bubble_type.to_string(), (size.width, size.height));
    }
}

/// 리사이즈 입력을 버블별 [기본 크기, 기본 × 1.6] 범위로 클램프한다(정수 논리 px).
fn clamp_widget_user_size(bubble_type: &str, width: f64, height: f64) -> LogicalSize<f64> {
    let base = widget_default_bubble_size(bubble_type);
    let max_width = (base.width * WIDGET_USER_SIZE_MAX_SCALE).round();
    let max_height = (base.height * WIDGET_USER_SIZE_MAX_SCALE).round();
    LogicalSize::new(
        width.round().clamp(base.width, max_width),
        height.round().clamp(base.height, max_height),
    )
}

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
    #[serde(default)]
    monitor_id: Option<String>,
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
type AuthenticatedSurfacesState = Mutex<bool>;
static WIDGET_READY_WINDOW_LABELS: LazyLock<Mutex<HashSet<String>>> =
    LazyLock::new(|| Mutex::new(HashSet::new()));
static REGISTERED_WIDGET_SHORTCUT: LazyLock<Mutex<Option<String>>> =
    LazyLock::new(|| Mutex::new(None));

// JS(desktop-widget page)가 논리 px 기준으로 보고하는 상호작용 가능 rect.
#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetInteractiveRect {
    height: f64,
    width: f64,
    x: f64,
    y: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetInteractiveRectsInput {
    rects: Vec<WidgetInteractiveRect>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AuthenticatedSurfacesInput {
    enabled: bool,
}

#[derive(Default)]
struct WidgetPointerState {
    last_applied_ignore: Option<bool>,
    last_moved_at: Option<Instant>,
    last_pointer_seen_at: Option<Instant>,
    poller_running: bool,
    rects: Vec<WidgetInteractiveRect>,
}

static WIDGET_POINTER_STATES: LazyLock<Mutex<HashMap<String, WidgetPointerState>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

// 갱신 깜빡임 방지용: 창별 "마지막으로 네이티브 창에 적용한 값" 캐시.
// apply_widget_window_state가 모드 전환/룸 컨텍스트 갱신마다 setter를 무조건 재호출하지 않고
// 실제로 바뀐 설정만 반영하게 한다(macOS에서 set_size/set_min/set_max 재호출은 눈에 띄는 깜빡임을 만든다).
#[derive(Default)]
struct WidgetAppliedWindowState {
    always_on_top: Option<bool>,
    shadow: Option<bool>,
    background_applied: bool,
    // macOS는 OS 드래그 좌표를 그대로 신뢰해 apply에서 위치를 다시 쓰지 않으므로 캐시도 두지 않는다.
    #[cfg(not(target_os = "macos"))]
    position: Option<(i64, i64)>,
    size: Option<(i64, i64)>,
}

static WIDGET_APPLIED_WINDOW_STATES: LazyLock<Mutex<HashMap<String, WidgetAppliedWindowState>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn with_widget_applied_window_state<T>(
    label: &str,
    update: impl FnOnce(&mut WidgetAppliedWindowState) -> T,
) -> Option<T> {
    let mut states = WIDGET_APPLIED_WINDOW_STATES.lock().ok()?;
    Some(update(states.entry(label.to_string()).or_default()))
}

/// 창이 파괴되거나 새로 만들어지기 직전에 캐시를 비워, 다음 창이 이전 창의 적용값을 물려받지 않게 한다.
fn reset_widget_applied_window_state(label: &str) {
    if let Ok(mut states) = WIDGET_APPLIED_WINDOW_STATES.lock() {
        states.remove(label);
    }
}

fn with_widget_pointer_state<T>(
    label: &str,
    update: impl FnOnce(&mut WidgetPointerState) -> T,
) -> Option<T> {
    let mut states = WIDGET_POINTER_STATES.lock().ok()?;
    Some(update(states.entry(label.to_string()).or_default()))
}

fn remove_widget_pointer_state(label: &str) {
    if let Ok(mut states) = WIDGET_POINTER_STATES.lock() {
        states.remove(label);
    }
}

fn note_widget_window_moved(label: &str) {
    if !is_widget_window_label(label) {
        return;
    }
    with_widget_pointer_state(label, |state| {
        state.last_moved_at = Some(Instant::now());
    });
}

/// apply_widget_window_state 등 폴러 밖에서 set_ignore_cursor_events를 호출한 뒤
/// 폴러가 실제 창 상태와 어긋난 판단을 하지 않도록 마지막 적용값을 동기화한다.
fn note_widget_ignore_applied(label: &str, ignoring: bool) {
    if !is_widget_window_label(label) {
        return;
    }
    with_widget_pointer_state(label, |state| {
        state.last_applied_ignore = Some(ignoring);
    });
}

/// 사용자가 수동으로 켠 클릭 통과는 폴러보다 우선한다.
fn widget_manual_click_through(app: &AppHandle, label: &str) -> bool {
    let state = app.state::<WidgetState>();
    let Ok(guard) = state.lock() else {
        // 상태를 읽지 못하면 폴러가 개입하지 않는 쪽이 안전하다.
        return true;
    };
    guard
        .bubbles
        .values()
        .find(|widget| widget_window_label(widget) == label)
        .map(|widget| widget.click_through)
        .unwrap_or(false)
}

fn widget_pointer_inside_rects(rects: &[WidgetInteractiveRect], x: f64, y: f64) -> bool {
    rects.iter().any(|rect| {
        x >= rect.x - WIDGET_POINTER_RECT_PADDING
            && x <= rect.x + rect.width + WIDGET_POINTER_RECT_PADDING
            && y >= rect.y - WIDGET_POINTER_RECT_PADDING
            && y <= rect.y + rect.height + WIDGET_POINTER_RECT_PADDING
    })
}

fn widget_pointer_scale(window: &WebviewWindow) -> f64 {
    window
        .current_monitor()
        .ok()
        .flatten()
        .map(|monitor| monitor.scale_factor())
        .or_else(|| window.scale_factor().ok())
        .unwrap_or(1.0)
        .max(0.5)
}

fn widget_pointer_local_position(
    cursor: &PhysicalPosition<f64>,
    origin: &PhysicalPosition<i32>,
    scale: f64,
) -> (f64, f64) {
    (
        (cursor.x - origin.x as f64) / scale,
        (cursor.y - origin.y as f64) / scale,
    )
}

fn widget_pointer_position_is_plausible(
    local_x: f64,
    local_y: f64,
    width: f64,
    height: f64,
) -> bool {
    local_x >= -WIDGET_POINTER_WINDOW_BOUNDS_TOLERANCE
        && local_x <= width + WIDGET_POINTER_WINDOW_BOUNDS_TOLERANCE
        && local_y >= -WIDGET_POINTER_WINDOW_BOUNDS_TOLERANCE
        && local_y <= height + WIDGET_POINTER_WINDOW_BOUNDS_TOLERANCE
}

/// 전역 커서 위치를 창-로컬 논리 좌표로 바꿔 보고된 rect 안팎을 판정한다.
/// rect 미보고·드래그 직후·API 실패 시에는 통과를 켜지 않는 안전한 기본값을 쓴다.
fn widget_pointer_should_ignore(window: &WebviewWindow, label: &str) -> bool {
    let (rects, recently_moved, pointer_recently_seen) = match WIDGET_POINTER_STATES.lock() {
        Ok(states) => match states.get(label) {
            Some(state) => (
                state.rects.clone(),
                state
                    .last_moved_at
                    .is_some_and(|at| at.elapsed().as_millis() < WIDGET_POINTER_DRAG_GRACE_MS),
                state
                    .last_pointer_seen_at
                    .is_some_and(|at| at.elapsed().as_millis() < WIDGET_POINTER_SEEN_GRACE_MS),
            ),
            None => return false,
        },
        Err(_) => return false,
    };

    // pointer_recently_seen: 웹뷰가 방금 상호작용 표면에서 마우스 이벤트를 받았다는 힌트(안전망).
    // rect 좌표 계산이 어긋나도 이 동안은 클릭 통과를 켜지 않아 헤더 드래그가 죽지 않는다.
    if rects.is_empty() || recently_moved || pointer_recently_seen {
        return false;
    }

    // tauri v2 데스크톱 API. 실패(권한/플랫폼 미지원 등) 시 클릭 가능 상태를 유지한다.
    let Ok(cursor) = window.cursor_position() else {
        return false;
    };
    let Ok(origin) = window.outer_position() else {
        return false;
    };
    let scale = widget_pointer_scale(window);
    let Ok(size) = window.outer_size() else {
        return false;
    };
    let (local_x, local_y) = widget_pointer_local_position(&cursor, &origin, scale);
    let width = size.width as f64 / scale;
    let height = size.height as f64 / scale;

    // 멀티 모니터/배율 전환 직후에는 OS가 커서·창 원점·scale을 한 틱 동안 서로 다른
    // 좌표계로 줄 수 있다. 이때 투명 영역으로 오판해 ignore=true를 걸면 창 조작이 죽으므로
    // 창 범위 밖으로 크게 튄 좌표는 안전하게 "클릭 가능"으로 실패시킨다.
    if !widget_pointer_position_is_plausible(local_x, local_y, width, height) {
        return false;
    }

    !widget_pointer_inside_rects(&rects, local_x, local_y)
}

/// 위젯 창마다 커서 폴러 스레드 하나를 유지한다. 창이 사라지면 스스로 종료·정리한다.
fn spawn_widget_pointer_poller(app: &AppHandle, label: String) {
    let should_spawn = with_widget_pointer_state(&label, |state| {
        if state.poller_running {
            false
        } else {
            state.poller_running = true;
            true
        }
    })
    .unwrap_or(false);
    if !should_spawn {
        return;
    }

    let app_for_poller = app.clone();
    let thread_label = label.clone();
    let spawned = thread::Builder::new()
        .name(format!("bubli-widget-pointer-{label}"))
        .spawn(move || {
            loop {
                thread::sleep(Duration::from_millis(WIDGET_POINTER_POLL_INTERVAL_MS));
                let Some(window) = app_for_poller.get_webview_window(&thread_label) else {
                    break;
                };

                // 수동 클릭 통과가 켜져 있는 동안 폴러는 일시 정지한다(수동 설정 우선).
                if widget_manual_click_through(&app_for_poller, &thread_label) {
                    with_widget_pointer_state(&thread_label, |state| {
                        state.last_applied_ignore = Some(true);
                    });
                    continue;
                }

                let desired = widget_pointer_should_ignore(&window, &thread_label);
                let changed = with_widget_pointer_state(&thread_label, |state| {
                    if state.last_applied_ignore == Some(desired) {
                        false
                    } else {
                        state.last_applied_ignore = Some(desired);
                        true
                    }
                })
                .unwrap_or(false);

                if changed {
                    if let Err(error) = window.set_ignore_cursor_events(desired) {
                        eprintln!(
                            "failed to toggle widget cursor pass-through for {thread_label}: {error}"
                        );
                    }
                }
            }

            remove_widget_pointer_state(&thread_label);
        });

    if let Err(error) = spawned {
        with_widget_pointer_state(&label, |state| {
            state.poller_running = false;
        });
        eprintln!("failed to spawn widget pointer poller for {label}: {error}");
    }
}

fn widget_native_shadow_enabled() -> bool {
    !cfg!(target_os = "windows")
}

fn widget_native_shadow_for_state(widget: &WidgetWindowState) -> bool {
    widget_native_shadow_enabled()
        && widget.mode != "GHOST"
        && widget.active_bubble != "bar"
        && widget.active_bubble != "menu"
}

fn widget_waits_for_dom_ready_before_show() -> bool {
    cfg!(target_os = "windows")
}

fn widget_unminimizes_before_show() -> bool {
    cfg!(target_os = "windows")
}

fn widget_should_unminimize_before_show(is_visible: bool) -> bool {
    !is_visible && widget_unminimizes_before_show()
}

fn reset_widget_window_dom_ready(label: &str) {
    if !widget_waits_for_dom_ready_before_show() {
        return;
    }
    if let Ok(mut labels) = WIDGET_READY_WINDOW_LABELS.lock() {
        labels.remove(label);
    }
}

fn mark_widget_window_dom_ready(label: &str) {
    if !widget_waits_for_dom_ready_before_show() {
        return;
    }
    if let Ok(mut labels) = WIDGET_READY_WINDOW_LABELS.lock() {
        labels.insert(label.to_string());
    }
}

fn widget_window_dom_ready(label: &str) -> bool {
    if !widget_waits_for_dom_ready_before_show() {
        return true;
    }
    WIDGET_READY_WINDOW_LABELS
        .lock()
        .map(|labels| labels.contains(label))
        .unwrap_or(false)
}

fn widget_initial_visible_on_build(widget: &WidgetWindowState) -> bool {
    widget.window_visible && !widget_waits_for_dom_ready_before_show()
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredWidgetWindowLayout {
    active_bubble: String,
    /// 저장 당시의 바 창 높이(논리 px). 바 pill은 창 하단 고정이라 릴리스 간 높이가 바뀌면
    /// 로드 시 저장 y를 델타만큼 보정한다. None = barLayoutHeight 도입 전(220) 레이아웃.
    #[serde(default)]
    bar_layout_height: Option<f64>,
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
struct WidgetBarDragInput {
    grab_x: f64,
    grab_y: f64,
    nav_height: f64,
    nav_width: f64,
    root_height: f64,
    root_width: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetBarPreviewPlacementInput {
    current_offset_top: f64,
    nav_height: f64,
    next_offset_top: f64,
    placement: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WidgetBarDragResult {
    placement: String,
    state: WidgetWindowState,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetWindowResizeInput {
    bubble_type: Option<String>,
    // true면(드래그 종료) 클램프된 최종 크기를 SQLite에 저장한다.
    commit: Option<bool>,
    height: f64,
    width: f64,
    window_id: Option<String>,
}

#[derive(Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetWindowOpenInput {
    bubble_type: Option<String>,
    mode: Option<String>,
    selected_room_id: Option<String>,
    window_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WidgetWindowsOpenInput {
    windows: Vec<WidgetWindowOpenInput>,
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
    surface_ready_only: Option<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MainWindowRouteInput {
    route: String,
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

/// 버블별 기본 자리 계단(우상단 스택)의 인덱스. 새 창이 같은 지점에 겹쳐 열리지 않게 한다.
fn widget_default_cascade_index(bubble_type: &str) -> f64 {
    match bubble_type {
        "agent" => 1.0,
        "chat" => 2.0,
        "timer" => 3.0,
        "memo" => 4.0,
        "schedule" => 5.0,
        "resource" => 6.0,
        "alert" => 7.0,
        _ => 0.0,
    }
}

fn default_widget_window_state(bubble_type: &str, window_id: Option<String>) -> WidgetWindowState {
    WidgetWindowState {
        // 기본은 비고정 — 위젯/메뉴가 처음부터 다른 앱 위에 고정돼 불편하던 것을 개선한다.
        // 바(dock)만 접근성상 고정 유지(잃어버려도 우클릭 복구가 별도로 있다).
        always_on_top: bubble_type == "bar",
        active_bubble: bubble_type.to_string(),
        click_through: false,
        dock_orb_visible: false,
        mode: "DEFAULT".to_string(),
        monitor_id: None,
        // 사용자가 옮기기 전까지는 좌표를 저장하지 않고(UNSET), 화면 크기 기반 기본 자리를 쓴다.
        position: WidgetWindowPosition {
            x: WIDGET_POSITION_UNSET,
            y: WIDGET_POSITION_UNSET,
        },
        selected_room_id: None,
        shortcut: Some("CommandOrControl+Shift+B".to_string()),
        tray_visible: true,
        window_id,
        window_visible: false,
    }
}

fn resolve_target_bubble(
    store: &WidgetWindowStore,
    requested_bubble: Option<String>,
    requested_window_id: Option<String>,
) -> String {
    if let Some(requested_bubble) = requested_bubble {
        return requested_bubble;
    }

    if let Some(requested_window_id) = requested_window_id {
        let trimmed = requested_window_id.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }

    store.active_bubble.clone()
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
    let target = normalize_bubble_type(Some(resolve_target_bubble(
        &guard,
        bubble_type,
        window_id.clone(),
    )));
    let window_key = normalize_window_key(&target, window_id);
    guard.active_bubble = target.clone();
    let widget = guard
        .bubbles
        .entry(window_key.clone())
        .or_insert_with(|| default_widget_window_state(&target, Some(window_key)));
    update(widget);
    Ok(widget.clone())
}

fn require_authenticated_surfaces_enabled(
    auth_state: &AuthenticatedSurfacesState,
) -> Result<(), String> {
    if authenticated_surfaces_enabled(auth_state)? {
        Ok(())
    } else {
        Err("authenticated Tauri surfaces are not enabled".to_string())
    }
}

fn authenticated_surfaces_enabled(auth_state: &AuthenticatedSurfacesState) -> Result<bool, String> {
    let enabled = auth_state
        .lock()
        .map_err(|_| "authenticated surfaces state lock failed".to_string())?;
    Ok(*enabled)
}

fn toggle_widget_window_from_shortcut(app: &AppHandle) -> Result<(), String> {
    let monitor_state = app.state::<AppMonitorState>();
    let state = app.state::<WidgetState>();
    let auth_state = app.state::<AuthenticatedSurfacesState>();

    if widget_visibility_after_toggle(&state, None, None)? {
        require_authenticated_surfaces_enabled(&auth_state)?;
    }

    let widget = with_widget_state(&state, None, None, |widget| {
        widget.window_visible = !widget.window_visible;
        widget.mode = if widget.window_visible {
            "DEFAULT".to_string()
        } else {
            "MINIMIZED".to_string()
        };
        widget.dock_orb_visible = false;
    })?;

    if !widget.window_visible
        && !widget_keeps_webview_when_hidden(&widget)
        && authenticated_surfaces_enabled(&auth_state)?
    {
        ensure_widget_bar_window(app, &monitor_state, &state)?;
    }

    persist_widget_window_state(app, &state)?;

    if widget.window_visible {
        build_widget_window(app, &monitor_state, &widget)?;
    } else {
        apply_widget_window_state(app, &monitor_state, &widget)?;
    }

    refresh_widget_bar_window(app, &monitor_state, &state)?;
    Ok(())
}

fn register_native_widget_shortcut(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    let normalized = shortcut.trim();
    if normalized.is_empty() {
        return Err("widget shortcut cannot be empty".to_string());
    }

    let previous = {
        let mut guard = REGISTERED_WIDGET_SHORTCUT
            .lock()
            .map_err(|_| "widget shortcut state lock failed".to_string())?;
        if guard.as_deref() == Some(normalized) && app.global_shortcut().is_registered(normalized) {
            return Ok(());
        }
        guard.take()
    };

    if let Some(previous) = previous {
        let _ = app.global_shortcut().unregister(previous.as_str());
    }

    app.global_shortcut()
        .on_shortcut(normalized, |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if let Err(error) = toggle_widget_window_from_shortcut(app) {
                    eprintln!("failed to toggle widget from global shortcut: {error}");
                }
            }
        })
        .map_err(|error| format!("failed to register widget shortcut: {error}"))?;

    let mut guard = REGISTERED_WIDGET_SHORTCUT
        .lock()
        .map_err(|_| "widget shortcut state lock failed".to_string())?;
    *guard = Some(normalized.to_string());
    Ok(())
}

fn widget_visibility_after_toggle(
    state: &WidgetState,
    bubble_type: Option<String>,
    window_id: Option<String>,
) -> Result<bool, String> {
    let guard = state
        .lock()
        .map_err(|_| "widget state lock failed".to_string())?;
    let target = normalize_bubble_type(Some(resolve_target_bubble(
        &guard,
        bubble_type,
        window_id.clone(),
    )));
    let window_key = normalize_window_key(&target, window_id);
    let currently_visible = guard
        .bubbles
        .get(&window_key)
        .map(|widget| widget.window_visible)
        .unwrap_or(false);
    Ok(!currently_visible)
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

/// 창 키(= label 접미사)는 버블 타입으로 고정한다 — 버블 타입당 네이티브 창은 정확히 하나다.
/// 과거에는 호출자가 넘긴 windowId를 그대로 키로 써서, 같은 버블에 서로 다른 windowId
/// (로그인 자동 실행 "todo" vs 저장 레이아웃의 "todo-…" 등)가 들어오면 스토어 키와 label이
/// 갈라져 같은 버블 창이 두 개 열렸다. bar/menu는 자기 타입("bar"/"menu")이 곧 키라 특수
/// 동작이 그대로 유지된다.
fn normalize_window_key(bubble_type: &str, _window_id: Option<String>) -> String {
    bubble_type.to_string()
}

fn apply_widget_window_mode_update(
    widget: &mut WidgetWindowState,
    mode: String,
    selected_room_id: Option<String>,
) {
    widget.mode = normalize_widget_mode(mode);
    // GHOST는 시각 모드일 뿐 영구 OS click-through로 저장하지 않는다.
    // true로 두면 set_ignore_cursor_events(true)가 창 전체에 걸려 고스트 해제 클릭도 받을 수 없다.
    widget.click_through = false;
    // 고스트는 항상 최상단에 떠야 한다 — 핀이 안 된 위젯이 다른 창 뒤로 묻히는 문제 수정.
    if widget.mode == "GHOST" {
        widget.always_on_top = true;
    }
    widget.dock_orb_visible = false;
    if let Some(selected_room_id) = selected_room_id {
        widget.selected_room_id = Some(selected_room_id);
    }
    widget.window_visible = widget.active_bubble == "bar" || widget.mode != "MINIMIZED";
}

fn apply_open_widget_window_update(
    widget: &mut WidgetWindowState,
    next_mode: String,
    selected_room_id: Option<String>,
) {
    widget.mode = next_mode;
    widget.click_through = false;
    // 열 때 자동으로 고정핀을 걸지 않는다 — 사용자가 원할 때만 핀을 켠다(기본 비고정).
    widget.dock_orb_visible = false;
    if let Some(selected_room_id) = selected_room_id {
        widget.selected_room_id = Some(selected_room_id);
    }
    widget.window_visible = widget.active_bubble == "bar" || widget.mode != "MINIMIZED";
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

/// 창 label은 항상 버블 타입 기반 캐논 값(bubli-widget-{type})이다. window_id가 아니라
/// active_bubble에서 파생해, 레거시 windowId를 지닌 스토어 항목도 같은 창을 가리킨다(중복 창 방지).
fn widget_window_label(widget: &WidgetWindowState) -> String {
    format!("{WIDGET_WINDOW_LABEL_PREFIX}-{}", widget.active_bubble)
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
        bar_layout_height: Some(WIDGET_BAR_HEIGHT),
        bubbles,
    }
}

fn widget_window_store_from_layout(layout: StoredWidgetWindowLayout) -> WidgetWindowStore {
    let mut bubbles = HashMap::new();
    // 바 창 높이 마이그레이션: 저장 시점 높이(구버전 220)와 현재 높이의 델타만큼 저장 y를
    // 위로 당겨, 하단 고정 pill이 화면에서 움직이지 않게 한다(top-left 저장 좌표 보정).
    let bar_height_delta =
        WIDGET_BAR_HEIGHT - layout.bar_layout_height.unwrap_or(WIDGET_BAR_LEGACY_HEIGHT);

    for mut widget in layout.bubbles {
        widget.active_bubble = normalize_bubble_type(Some(widget.active_bubble));
        widget.mode = normalize_widget_mode(widget.mode);
        if widget.mode == "GHOST" {
            widget.click_through = false;
        }
        if widget.active_bubble != "bar" && widget.mode == "MINIMIZED" {
            widget.window_visible = false;
        }
        if widget.active_bubble == "bar"
            && bar_height_delta != 0.0
            && !widget_position_is_unset(&widget.position)
        {
            widget.position.y =
                ((widget.position.y as f64 - bar_height_delta).round() as i32).max(0);
        }
        let key = normalize_window_key(&widget.active_bubble, widget.window_id.clone());
        widget.window_id = Some(key.clone());
        match bubbles.entry(key) {
            Entry::Vacant(entry) => {
                entry.insert(widget);
            }
            Entry::Occupied(mut entry) => {
                // 과거 빌드가 같은 버블을 여러 windowId 키("todo"와 "todo-…" 등)로 저장한
                // 레이아웃 파일이 남아 있을 수 있다 — 같은 버블 창이 두 개 열리던 근원.
                // 보이는 항목 > 좌표가 저장된 항목 순으로 하나만 남긴다.
                let existing = entry.get();
                let replaces = (widget.window_visible && !existing.window_visible)
                    || (widget.window_visible == existing.window_visible
                        && widget_position_is_unset(&existing.position)
                        && !widget_position_is_unset(&widget.position));
                if replaces {
                    entry.insert(widget);
                }
            }
        }
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

    let monitor = app
        .get_webview_window(label)
        .and_then(|window| window.current_monitor().ok().flatten())
        .map(|monitor| {
            let (monitors, _primary) = list_monitors(app)?;
            let id = monitors
                .iter()
                .enumerate()
                .find(|(_, candidate)| monitors_match(candidate, &monitor))
                .map(|(index, candidate)| monitor_id(candidate, index))
                .unwrap_or_else(|| PRIMARY_MONITOR_ID.to_string());
            Ok::<(Monitor, String), String>((monitor, id))
        })
        .transpose()?
        .or_else(|| {
            monitor_nearest_physical_point(app, absolute_x as f64, absolute_y as f64)
                .ok()
                .flatten()
        });
    let scale = monitor
        .as_ref()
        .map(|(monitor, _)| monitor.scale_factor())
        .unwrap_or(1.0)
        .max(0.5);
    let origin = monitor.as_ref().map(|(monitor, _)| monitor.position());
    let origin_x = origin.map_or(0, |position| position.x);
    let origin_y = origin.map_or(0, |position| position.y);
    let (work_area_x, work_area_y, work_area_width, work_area_height) =
        monitor_work_area_logical(monitor.as_ref().map(|(monitor, _)| monitor), scale);
    // Moved 이벤트 좌표는 물리 px이므로 현재 창이 올라간 모니터의 논리 px(모니터-로컬)로 환산해 저장한다.
    // widget_screen_position이 같은 단위로 복원하므로 HiDPI에서도 위치가 두 배로 밀리지 않는다.
    let relative_x = ((absolute_x - origin_x) as f64 / scale).round() as i32;
    let relative_y = ((absolute_y - origin_y) as f64 / scale).round() as i32;
    let next_monitor_id = monitor.as_ref().map(|(_, id)| id.clone());

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

        let size = widget_window_size(widget);
        let (clamped_x, clamped_y) = clamp_widget_local_position(
            widget,
            &size,
            work_area_x,
            work_area_y,
            work_area_width,
            work_area_height,
            relative_x as f64,
            relative_y as f64,
        );
        widget.position = WidgetWindowPosition {
            x: clamped_x.round() as i32,
            y: clamped_y.round() as i32,
        };
        widget.monitor_id = next_monitor_id;
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

#[cfg(target_os = "macos")]
fn onboarding_overlay_window_geometry(
    app: &AppHandle,
    monitor_state: &AppMonitorState,
) -> Result<(LogicalPosition<f64>, LogicalSize<f64>), String> {
    let preferred_monitor_id = get_preferred_monitor_id(monitor_state)?;
    let monitor = resolve_preferred_monitor(app, &preferred_monitor_id)?;
    let scale = monitor
        .as_ref()
        .map(|monitor| monitor.scale_factor())
        .unwrap_or(1.0)
        .max(0.5);
    let origin = monitor.as_ref().map(|monitor| monitor.position());
    let origin_x = origin.map_or(0.0, |position| position.x as f64 / scale);
    let origin_y = origin.map_or(0.0, |position| position.y as f64 / scale);
    let size = LogicalSize::new(
        monitor
            .as_ref()
            .map(|monitor| monitor.size().width as f64 / scale)
            .unwrap_or(WIDGET_FALLBACK_MONITOR_WIDTH),
        monitor
            .as_ref()
            .map(|monitor| monitor.size().height as f64 / scale)
            .unwrap_or(WIDGET_FALLBACK_MONITOR_HEIGHT),
    );
    Ok((LogicalPosition::new(origin_x, origin_y), size))
}

fn widget_window_size(widget: &WidgetWindowState) -> LogicalSize<f64> {
    if widget.active_bubble == "bar" {
        // 바 창은 칩 수와 무관하게 최대 폭 고정. 리사이즈가 없어 macOS에서 잘림/깜빡임이 없다.
        return LogicalSize::new(WIDGET_BAR_WIDTH, WIDGET_BAR_HEIGHT);
    }
    if widget.active_bubble == "menu" {
        return LogicalSize::new(WIDGET_MENU_WIDTH, WIDGET_MENU_HEIGHT);
    }

    match widget.mode.as_str() {
        "MINIMIZED" => LogicalSize::new(
            WIDGET_MINIMIZED_WIDTH + 20.0,
            WIDGET_MINIMIZED_HEIGHT + 20.0,
        ),
        "GHOST" => LogicalSize::new(188.0 + 24.0, 188.0 + 24.0),
        // 콘텐츠 자동 높이에 맞춘 기본 창 크기 위에, 사용자가 리사이즈로 저장한 크기를
        // 우선한다(클램프된 값만 저장되므로 여기서는 그대로 쓴다).
        _ => widget_user_size_override(&widget.active_bubble)
            .unwrap_or_else(|| widget_default_bubble_size(&widget.active_bubble)),
    }
}

/// 버블별 기본(최소) 창 크기 — src/app/desktop-widget/page.tsx getWidgetWindowSize와 동기화한다.
/// 정수 논리 px만 쓴다(HiDPI에서 분수 높이로 인한 라운드 코너 왜곡 방지).
fn widget_default_bubble_size(bubble_type: &str) -> LogicalSize<f64> {
    match bubble_type {
        "chat" => LogicalSize::new(336.0 + WIDGET_WINDOW_GUTTER, 420.0 + WIDGET_WINDOW_GUTTER),
        "agent" => LogicalSize::new(332.0 + WIDGET_WINDOW_GUTTER, 420.0 + WIDGET_WINDOW_GUTTER),
        "timer" => LogicalSize::new(324.0 + WIDGET_WINDOW_GUTTER, 400.0 + WIDGET_WINDOW_GUTTER),
        "resource" => LogicalSize::new(324.0 + WIDGET_WINDOW_GUTTER, 330.0 + WIDGET_WINDOW_GUTTER),
        "memo" => LogicalSize::new(308.0 + WIDGET_WINDOW_GUTTER, 320.0 + WIDGET_WINDOW_GUTTER),
        "schedule" => LogicalSize::new(324.0 + WIDGET_WINDOW_GUTTER, 340.0 + WIDGET_WINDOW_GUTTER),
        _ => LogicalSize::new(
            WIDGET_DEFAULT_WIDTH + WIDGET_WINDOW_GUTTER,
            WIDGET_DEFAULT_HEIGHT + WIDGET_WINDOW_GUTTER,
        ),
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

fn monitor_with_id(monitor: &Monitor, index: usize) -> (Monitor, String) {
    (monitor.clone(), monitor_id(monitor, index))
}

fn primary_or_first_monitor_with_id(
    monitors: &[Monitor],
    primary: Option<Monitor>,
) -> Option<(Monitor, String)> {
    if let Some(primary_monitor) = primary {
        let id = monitors
            .iter()
            .enumerate()
            .find(|(_, monitor)| monitors_match(monitor, &primary_monitor))
            .map(|(index, monitor)| monitor_id(monitor, index))
            .unwrap_or_else(|| PRIMARY_MONITOR_ID.to_string());
        return Some((primary_monitor, id));
    }

    monitors.first().map(|monitor| monitor_with_id(monitor, 0))
}

fn resolve_monitor_with_id(
    app: &AppHandle,
    monitor_id_value: &str,
) -> Result<Option<(Monitor, String)>, String> {
    let (monitors, primary) = list_monitors(app)?;
    if monitor_id_value == PRIMARY_MONITOR_ID {
        return Ok(primary_or_first_monitor_with_id(&monitors, primary));
    }

    Ok(monitors
        .iter()
        .enumerate()
        .find(|(index, monitor)| monitor_id(monitor, *index) == monitor_id_value)
        .map(|(index, monitor)| monitor_with_id(monitor, index))
        .or_else(|| primary_or_first_monitor_with_id(&monitors, primary)))
}

fn monitor_nearest_physical_point(
    app: &AppHandle,
    x: f64,
    y: f64,
) -> Result<Option<(Monitor, String)>, String> {
    let (monitors, primary) = list_monitors(app)?;
    let primary_id = primary.as_ref().and_then(|primary_monitor| {
        monitors
            .iter()
            .enumerate()
            .find(|(_, monitor)| monitors_match(monitor, primary_monitor))
            .map(|(index, monitor)| monitor_id(monitor, index))
    });

    let mut best: Option<(f64, bool, Monitor, String)> = None;
    for (index, monitor) in monitors.iter().enumerate() {
        let position = monitor.position();
        let size = monitor.size();
        let left = position.x as f64;
        let top = position.y as f64;
        let right = left + size.width as f64;
        let bottom = top + size.height as f64;
        let dx = if x < left {
            left - x
        } else if x > right {
            x - right
        } else {
            0.0
        };
        let dy = if y < top {
            top - y
        } else if y > bottom {
            y - bottom
        } else {
            0.0
        };
        let distance = dx * dx + dy * dy;
        let id = monitor_id(monitor, index);
        let is_primary = primary_id.as_ref().is_some_and(|value| value == &id);
        let should_replace = best
            .as_ref()
            .map(|(best_distance, best_is_primary, _, _)| {
                distance < *best_distance
                    || ((distance - *best_distance).abs() < f64::EPSILON
                        && is_primary
                        && !*best_is_primary)
            })
            .unwrap_or(true);

        if should_replace {
            best = Some((distance, is_primary, monitor.clone(), id));
        }
    }

    Ok(best.map(|(_, _, monitor, id)| (monitor, id)))
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

fn widget_position_is_unset(position: &WidgetWindowPosition) -> bool {
    position.x == WIDGET_POSITION_UNSET || position.y == WIDGET_POSITION_UNSET
}

/// 저장 좌표가 없는 창의 기본 자리(모니터-로컬 논리 px).
/// 바=하단 중앙, 메뉴=하단 중앙에서 바보다 위, 버블=우상단에서 24px 계단(cascade).
fn widget_default_local_position(
    widget: &WidgetWindowState,
    size: &LogicalSize<f64>,
    monitor_width: f64,
    monitor_height: f64,
) -> (f64, f64) {
    match widget.active_bubble.as_str() {
        "bar" => (
            ((monitor_width - size.width) / 2.0).max(0.0),
            (monitor_height - size.height - WIDGET_DEFAULT_MARGIN).max(WIDGET_DEFAULT_MARGIN),
        ),
        "menu" => (
            ((monitor_width - size.width) / 2.0).max(0.0),
            (monitor_height - size.height - WIDGET_DEFAULT_MARGIN * 4.0).max(WIDGET_DEFAULT_MARGIN),
        ),
        bubble_type => {
            let step = widget_default_cascade_index(bubble_type) * WIDGET_DEFAULT_MARGIN;
            (
                (monitor_width - size.width - WIDGET_DEFAULT_MARGIN - step)
                    .max(WIDGET_DEFAULT_MARGIN),
                WIDGET_DEFAULT_MARGIN + step,
            )
        }
    }
}

fn clamp_widget_local_position(
    widget: &WidgetWindowState,
    size: &LogicalSize<f64>,
    work_area_x: f64,
    work_area_y: f64,
    work_area_width: f64,
    work_area_height: f64,
    x: f64,
    y: f64,
) -> (f64, f64) {
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (
            widget,
            size,
            work_area_x,
            work_area_y,
            work_area_width,
            work_area_height,
        );
        return (x, y);
    }

    #[cfg(target_os = "macos")]
    {
        if widget.active_bubble != "bar" {
            return (x, y);
        }

        let min_x = work_area_x - (size.width - WIDGET_BAR_MIN_VISIBLE_WIDTH).max(0.0);
        let max_x = (work_area_x + work_area_width - WIDGET_BAR_MIN_VISIBLE_WIDTH).max(min_x);
        // 기본(위쪽 프리뷰) 배치에서는 pill이 창 하단에 붙는다. 따라서 화면 상단에서는
        // native window y가 음수가 될 수 있어야 보이는 pill이 실제 상단까지 올라간다.
        let visible_top_offset = (size.height - WIDGET_BAR_VISIBLE_HEIGHT).max(0.0);
        let visible_bottom_offset =
            (size.height - WIDGET_BAR_ROOT_PADDING).max(WIDGET_BAR_VISIBLE_HEIGHT);
        let min_y = work_area_y + WIDGET_DEFAULT_MARGIN - visible_top_offset;
        let max_y =
            (work_area_y + work_area_height - WIDGET_DEFAULT_MARGIN - visible_bottom_offset)
                .max(min_y);

        (x.clamp(min_x, max_x), y.clamp(min_y, max_y))
    }
}

fn monitor_work_area_logical(monitor: Option<&Monitor>, scale: f64) -> (f64, f64, f64, f64) {
    if let Some(monitor) = monitor {
        #[cfg(not(target_os = "macos"))]
        {
            return (
                0.0,
                0.0,
                monitor.size().width as f64 / scale,
                monitor.size().height as f64 / scale,
            );
        }

        #[cfg(target_os = "macos")]
        {
            let origin = monitor.position();
            let work_area = monitor.work_area();
            let work_height = work_area.size.height as f64 / scale;
            let dock_guard = macos_dock_guard_logical(monitor, work_height, scale);
            return (
                (work_area.position.x - origin.x) as f64 / scale,
                (work_area.position.y - origin.y) as f64 / scale,
                work_area.size.width as f64 / scale,
                (work_height - dock_guard).max(WIDGET_BAR_VISIBLE_HEIGHT + WIDGET_DEFAULT_MARGIN),
            );
        }
    }

    (
        0.0,
        0.0,
        WIDGET_FALLBACK_MONITOR_WIDTH,
        WIDGET_FALLBACK_MONITOR_HEIGHT,
    )
}

#[cfg(target_os = "macos")]
fn macos_dock_guard_logical(monitor: &Monitor, work_area_height: f64, scale: f64) -> f64 {
    #[cfg(target_os = "macos")]
    {
        let monitor_height = monitor.size().height as f64 / scale;
        let excluded_height = (monitor_height - work_area_height).max(0.0);
        if excluded_height < 48.0 {
            return WIDGET_MACOS_DOCK_GUARD;
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (monitor, work_area_height, scale);
    }

    0.0
}

fn macos_dock_guard_physical(monitor: &Monitor, work_area_height: f64, scale: f64) -> f64 {
    #[cfg(target_os = "macos")]
    {
        let monitor_height = monitor.size().height as f64;
        let excluded_height = (monitor_height - work_area_height).max(0.0);
        if excluded_height < 48.0 * scale {
            return WIDGET_MACOS_DOCK_GUARD * scale;
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (monitor, work_area_height, scale);
    }

    0.0
}

fn widget_screen_position(
    app: &AppHandle,
    monitor_state: &AppMonitorState,
    widget: &WidgetWindowState,
) -> Result<LogicalPosition<f64>, String> {
    let preferred_monitor_id = get_preferred_monitor_id(monitor_state)?;
    let monitor = if let Some(widget_monitor_id) = widget.monitor_id.as_deref() {
        resolve_monitor_with_id(app, widget_monitor_id)?.or_else(|| {
            resolve_monitor_with_id(app, &preferred_monitor_id)
                .ok()
                .flatten()
        })
    } else {
        resolve_monitor_with_id(app, &preferred_monitor_id)?
    };
    let scale = monitor
        .as_ref()
        .map(|(monitor, _)| monitor.scale_factor())
        .unwrap_or(1.0)
        .max(0.5);
    // 모니터 원점/크기는 물리 px이므로 논리 px로 환산해 저장 좌표(논리, 모니터-로컬)와 합친다.
    let origin = monitor.as_ref().map(|(monitor, _)| monitor.position());
    let origin_x = origin.map_or(0.0, |position| position.x as f64 / scale);
    let origin_y = origin.map_or(0.0, |position| position.y as f64 / scale);
    let (work_area_x, work_area_y, work_area_width, work_area_height) =
        monitor_work_area_logical(monitor.as_ref().map(|(monitor, _)| monitor), scale);
    let size = widget_window_size(widget);

    if !widget_position_is_unset(&widget.position) {
        let (local_x, local_y) = clamp_widget_local_position(
            widget,
            &size,
            work_area_x,
            work_area_y,
            work_area_width,
            work_area_height,
            widget.position.x as f64,
            widget.position.y as f64,
        );
        return Ok(LogicalPosition::new(origin_x + local_x, origin_y + local_y));
    }

    let (default_x, default_y) =
        widget_default_local_position(widget, &size, work_area_width, work_area_height);
    let local_x = work_area_x + default_x;
    let local_y = work_area_y + default_y;

    Ok(LogicalPosition::new(origin_x + local_x, origin_y + local_y))
}

fn position_main_window_on_preferred_monitor(
    app: &AppHandle,
    monitor_state: &AppMonitorState,
) -> Result<(), String> {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return Ok(());
    };
    let _ = window.unminimize();
    let _ = window.show();

    let preferred_monitor_id = get_preferred_monitor_id(monitor_state)?;
    let Some(monitor) = resolve_preferred_monitor(app, &preferred_monitor_id)? else {
        let _ = window.set_focus();
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

    #[cfg(target_os = "macos")]
    let position = Position::Physical(tauri::PhysicalPosition::new(x, y));
    #[cfg(not(target_os = "macos"))]
    let position = Position::Logical(LogicalPosition::new(x as f64, y as f64));

    window
        .set_position(position)
        .map_err(|error| error.to_string())?;

    let _ = window.set_focus();

    Ok(())
}

#[cfg(target_os = "windows")]
fn local_auto_sync_runtime_smoke_requested() -> bool {
    env::var("NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE")
        .ok()
        .as_deref()
        == Some("true")
        && env::var("NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE_PHASE")
            .ok()
            .as_deref()
            == Some("local-auto-sync")
}

#[cfg(not(target_os = "windows"))]
fn local_auto_sync_runtime_smoke_requested() -> bool {
    false
}

fn hide_main_window_for_local_auto_sync_smoke(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        if let Err(error) = window.hide() {
            eprintln!("failed to hide main window for local auto-sync smoke: {error}");
        }
    }
}

fn normalize_main_window_route(route: &str) -> Result<String, String> {
    let trimmed = route.trim();
    if trimmed.is_empty()
        || trimmed.starts_with("//")
        || trimmed.contains("://")
        || trimmed.to_ascii_lowercase().starts_with("javascript:")
    {
        return Err("main window route must be an app-internal path".to_string());
    }

    let normalized = if trimmed.starts_with('/') {
        trimmed.to_string()
    } else {
        format!("/{trimmed}")
    };

    if route_targets_chat_widget(&normalized) {
        return Err("chat routes must open the Tauri chat widget, not the main window".to_string());
    }

    if normalized == "/"
        || normalized == "/app"
        || normalized.starts_with("/app/")
        || normalized.starts_with("/app?")
    {
        Ok(normalized)
    } else {
        Err("main window route must start with /app".to_string())
    }
}

fn route_targets_chat_widget(normalized_route: &str) -> bool {
    let path = normalized_route
        .split(&['?', '#'])
        .next()
        .unwrap_or(normalized_route)
        .trim_end_matches('/');

    if path == "/app/chat" {
        return true;
    }

    let segments = path
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>();
    segments.len() >= 4
        && segments[0] == "app"
        && segments[1] == "project-rooms"
        && !segments[2].is_empty()
        && segments[3] == "chat"
}

fn map_main_window_route_for_static_assets(normalized_route: &str) -> String {
    let (route_without_hash, hash) = normalized_route
        .split_once('#')
        .map_or((normalized_route, None), |(path, hash)| (path, Some(hash)));
    let (path, query) = route_without_hash
        .split_once('?')
        .map_or((route_without_hash, None), |(path, query)| {
            (path, Some(query))
        });
    let trimmed_path = path.trim_end_matches('/');
    let segments = trimmed_path
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>();

    if segments.len() >= 3 && segments[0] == "app" && segments[1] == "project-rooms" {
        let room_id = segments[2];
        let static_path = match segments.get(3).copied() {
            None | Some("work") => Some("/app/project-room-work"),
            Some("resources") => Some("/app/project-room-resources"),
            _ => None,
        };

        if let Some(static_path) = static_path {
            let mut mapped = format!("{static_path}?roomId={room_id}");
            if let Some(query) = query.filter(|value| !value.is_empty()) {
                mapped.push('&');
                mapped.push_str(query);
            }
            if let Some(hash) = hash.filter(|value| !value.is_empty()) {
                mapped.push('#');
                mapped.push_str(hash);
            }
            return mapped;
        }
    }

    normalized_route.to_string()
}

#[tauri::command]
fn open_main_window_route(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
    input: MainWindowRouteInput,
) -> Result<String, String> {
    let route =
        map_main_window_route_for_static_assets(&normalize_main_window_route(&input.route)?);
    let window = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| "main window not found".to_string())?;

    position_main_window_on_preferred_monitor(&app, &monitor_state)?;

    let route_json = serde_json::to_string(&route).map_err(|error| error.to_string())?;
    window
        .eval(&format!("window.location.assign({route_json});"))
        .map_err(|error| error.to_string())?;

    Ok(route)
}

// 자료 다운로드 등 발급된 외부(http/https) URL을 OS 기본 브라우저로 연다.
// Tauri 웹뷰에서는 window.open(_blank)이 막혀 다운로드가 시작되지 않으므로 이 경로를 쓴다.
// 보안상 http/https 스킴만 허용한다(file:, javascript: 등 차단).
#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let trimmed = url.trim();
    let is_web_url = {
        let lowered = trimmed.to_ascii_lowercase();
        lowered.starts_with("https://") || lowered.starts_with("http://")
    };
    if !is_web_url {
        return Err("only http/https URLs may be opened externally".to_string());
    }

    tauri_plugin_opener::open_url(trimmed, None::<&str>).map_err(|error| error.to_string())
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
        if is_widget_window_label(&label) || label == ONBOARDING_OVERLAY_WINDOW_LABEL {
            reset_widget_window_dom_ready(&label);
            reset_widget_applied_window_state(&label);
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
    _monitor_state: &AppMonitorState,
    widget: &WidgetWindowState,
) -> Result<WidgetWindowState, String> {
    let label = widget_window_label(widget);

    if let Some(window) = app.get_webview_window(&label) {
        if !widget.window_visible && !widget_keeps_webview_when_hidden(widget) {
            reset_widget_window_dom_ready(&label);
            reset_widget_applied_window_state(&label);
            window.destroy().map_err(|error| error.to_string())?;
            return Ok(widget.clone());
        }

        // 갱신 깜빡임 방지: 아래 setter들은 전부 "마지막 적용값과 다를 때만" 호출한다.
        let always_on_top_changed = with_widget_applied_window_state(&label, |applied| {
            if applied.always_on_top == Some(widget.always_on_top) {
                false
            } else {
                applied.always_on_top = Some(widget.always_on_top);
                true
            }
        })
        .unwrap_or(true);
        if always_on_top_changed {
            window
                .set_always_on_top(widget.always_on_top)
                .map_err(|error| error.to_string())?;
        }

        let shadow = widget_native_shadow_for_state(widget);
        let shadow_changed = with_widget_applied_window_state(&label, |applied| {
            if applied.shadow == Some(shadow) {
                false
            } else {
                applied.shadow = Some(shadow);
                true
            }
        })
        .unwrap_or(true);
        if shadow_changed {
            window
                .set_shadow(shadow)
                .map_err(|error| error.to_string())?;
        }

        let ignore_changed = with_widget_pointer_state(&label, |state| {
            state.last_applied_ignore != Some(widget.click_through)
        })
        .unwrap_or(true);
        if ignore_changed {
            window
                .set_ignore_cursor_events(widget.click_through)
                .map_err(|error| error.to_string())?;
            note_widget_ignore_applied(&label, widget.click_through);
        }

        // 창은 resizable(false) + 고정 min/max로 만들어지므로, 계산 크기가 실제로 바뀔 때만
        // min을 먼저 해제해(항상 min<=max 유지) max→min→size 순서로 다시 잠근다.
        // macOS에서 "새 min > 기존 max" 순서의 set_min_size는 조용히 실패할 수 있다.
        let size = widget_window_size(widget);
        let size_key = (size.width.round() as i64, size.height.round() as i64);
        let size_changed = with_widget_applied_window_state(&label, |applied| {
            if applied.size == Some(size_key) {
                false
            } else {
                applied.size = Some(size_key);
                true
            }
        })
        .unwrap_or(true);
        if size_changed {
            window
                .set_min_size(None::<Size>)
                .map_err(|error| error.to_string())?;
            window
                .set_max_size(Some(Size::Logical(size)))
                .map_err(|error| error.to_string())?;
            window
                .set_min_size(Some(Size::Logical(size)))
                .map_err(|error| error.to_string())?;
            window
                .set_size(Size::Logical(size))
                .map_err(|error| error.to_string())?;
        }
        #[cfg(not(target_os = "macos"))]
        {
            let position = widget_screen_position(app, _monitor_state, widget)?;
            let position_key = (position.x.round() as i64, position.y.round() as i64);
            let position_changed = with_widget_applied_window_state(&label, |applied| {
                if applied.position == Some(position_key) {
                    false
                } else {
                    applied.position = Some(position_key);
                    true
                }
            })
            .unwrap_or(true);
            if position_changed {
                window
                    .set_position(Position::Logical(position))
                    .map_err(|error| error.to_string())?;
            }
        }
        let background_changed = with_widget_applied_window_state(&label, |applied| {
            if applied.background_applied {
                false
            } else {
                applied.background_applied = true;
                true
            }
        })
        .unwrap_or(true);
        if background_changed {
            window
                .set_background_color(Some(Color(0, 0, 0, 0)))
                .map_err(|error| error.to_string())?;
        }

        let is_visible = window.is_visible().unwrap_or(false);
        if widget.window_visible {
            if widget_should_unminimize_before_show(is_visible) {
                let _ = window.unminimize();
            }
            if !is_visible && widget_window_dom_ready(&label) {
                window.show().map_err(|error| error.to_string())?;
            }
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

    if app.get_webview_window(&label).is_some() {
        return apply_widget_window_state(app, monitor_state, widget);
    }

    let size = widget_window_size(widget);
    let position = widget_screen_position(app, monitor_state, widget)?;
    let initial_visible = widget_initial_visible_on_build(widget);
    reset_widget_window_dom_ready(&label);
    reset_widget_applied_window_state(&label);
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
    .devtools(false)
    // 바/메뉴 창은 작은 콘텐츠(pill·오브)가 큰 투명창에 떠 있어, 네이티브 창 그림자가
    // 콘텐츠를 두르는 "창 테두리"처럼 보인다 → 이 두 창만 그림자를 끈다(버블 창은 유지).
    // GHOST 모드도 콘텐츠만 떠야 하므로 런타임 전환 시 set_shadow(false)로 맞춘다.
    .shadow(widget_native_shadow_for_state(widget))
    .resizable(false)
    .always_on_top(widget.always_on_top)
    .skip_taskbar(true)
    .focused(false)
    .visible(initial_visible)
    .build()
    .map_err(|error| error.to_string())?;

    let app_for_move_event = app.clone();
    let label_for_move_event = label.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Moved(position) = event {
            // 드래그 중에는 커서 폴러가 클릭 통과를 켜지 않도록 최근 이동 시각을 남긴다.
            note_widget_window_moved(&label_for_move_event);
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
    note_widget_ignore_applied(&label, widget.click_through);
    // 빌더가 이미 적용한 값을 캐시에 기록해, 바로 뒤의 apply가 같은 setter를 중복 호출하지 않게 한다.
    with_widget_applied_window_state(&label, |applied| {
        applied.always_on_top = Some(widget.always_on_top);
        applied.shadow = Some(widget_native_shadow_for_state(widget));
        applied.background_applied = true;
        applied.size = Some((size.width.round() as i64, size.height.round() as i64));
        #[cfg(not(target_os = "macos"))]
        {
            applied.position = Some((position.x.round() as i64, position.y.round() as i64));
        }
    });
    apply_widget_window_state(app, monitor_state, widget)
}

fn schedule_widget_window_build(
    app: &AppHandle,
    _monitor_state: &AppMonitorState,
    widget: &WidgetWindowState,
) -> Result<WidgetWindowState, String> {
    schedule_widget_window_build_with_options(app, _monitor_state, widget, false)
}

fn schedule_widget_window_build_and_raise(
    app: &AppHandle,
    _monitor_state: &AppMonitorState,
    widget: &WidgetWindowState,
) -> Result<WidgetWindowState, String> {
    schedule_widget_window_build_with_options(app, _monitor_state, widget, true)
}

fn schedule_widget_window_build_with_options(
    app: &AppHandle,
    _monitor_state: &AppMonitorState,
    widget: &WidgetWindowState,
    raise_after_build: bool,
) -> Result<WidgetWindowState, String> {
    #[cfg(target_os = "macos")]
    {
        let app_for_build = app.clone();
        let widget_for_build = widget.clone();
        let label = widget_window_label(widget);
        thread::Builder::new()
            .name(format!("bubli-widget-build-{label}"))
            .spawn(move || {
                let monitor_state = app_for_build.state::<AppMonitorState>();
                if let Err(error) =
                    build_widget_window(&app_for_build, &monitor_state, &widget_for_build)
                {
                    eprintln!("failed to build widget window {label}: {error}");
                } else if raise_after_build {
                    raise_widget_window(&app_for_build, &widget_for_build);
                }
            })
            .map_err(|error| error.to_string())?;

        Ok(widget.clone())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = raise_after_build;
        build_widget_window(app, _monitor_state, widget)
    }
}

#[cfg(target_os = "macos")]
fn raise_widget_window(app: &AppHandle, widget: &WidgetWindowState) {
    if !widget.window_visible {
        return;
    }

    let label = widget_window_label(widget);
    let Some(window) = app.get_webview_window(&label) else {
        return;
    };

    if widget.always_on_top {
        let _ = window.set_always_on_top(false);
        let _ = window.set_always_on_top(true);
    }
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
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
    Ok(widget_bar_items_from_store(&guard))
}

fn widget_bar_items_from_store(store: &WidgetWindowStore) -> Vec<WidgetWindowState> {
    let mut items: Vec<WidgetWindowState> = store
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

    // 방어적 중복 제거: 스토어 키가 버블 타입으로 고정돼 정상 경로에서는 중복이 없지만,
    // 같은 버블 칩이 바에 두 번 뜨는 일은 어떤 경우에도 없어야 한다.
    let mut seen_bubbles = HashSet::new();
    items.retain(|widget| seen_bubbles.insert(widget.active_bubble.clone()));

    items
}

fn recover_stale_visible_widgets_for_bar(
    store: &mut WidgetWindowStore,
    existing_window_labels: &HashSet<String>,
) {
    for widget in store.bubbles.values_mut() {
        if widget.active_bubble == "bar" || !widget.window_visible {
            continue;
        }

        let label = widget_window_label(widget);
        if existing_window_labels.contains(&label) {
            continue;
        }

        widget.mode = "MINIMIZED".to_string();
        widget.click_through = false;
        widget.dock_orb_visible = false;
        widget.window_visible = false;
    }
}

fn widget_bar_state_for_show(store: &mut WidgetWindowStore) -> WidgetWindowState {
    let widget = store
        .bubbles
        .entry("bar".to_string())
        .or_insert_with(|| default_widget_window_state("bar", Some("bar".to_string())));
    widget.mode = "DEFAULT".to_string();
    widget.click_through = false;
    widget.window_visible = true;
    widget.clone()
}

/// 버블을 최소화하면 흩어진 창이 남지 않고 항상 하나의 독 바로 모이도록,
/// 최소화 시점에 바 창을 보이는 상태로 보장한다.
fn ensure_widget_bar_window(
    app: &AppHandle,
    monitor_state: &AppMonitorState,
    state: &WidgetState,
) -> Result<WidgetWindowState, String> {
    let bar = {
        let mut guard = state
            .lock()
            .map_err(|_| "widget state lock failed".to_string())?;
        widget_bar_state_for_show(&mut guard)
    };
    schedule_widget_window_build(app, monitor_state, &bar)
}

/// 버블 복원/모드 전환 뒤 이미 떠 있는 바 창의 상태를 재적용한다.
/// 바 크기는 560 고정이고 setter는 변경분만 반영하므로 사실상 가시성 동기화만 남는다.
fn refresh_widget_bar_window(
    app: &AppHandle,
    monitor_state: &AppMonitorState,
    state: &WidgetState,
) -> Result<(), String> {
    let bar = {
        let guard = state
            .lock()
            .map_err(|_| "widget state lock failed".to_string())?;
        guard.bubbles.get("bar").cloned()
    };
    let Some(bar) = bar else {
        return Ok(());
    };
    if app.get_webview_window(&widget_window_label(&bar)).is_some() {
        apply_widget_window_state(app, monitor_state, &bar)?;
    }
    Ok(())
}

fn seed_widget_bar_items_for_store(
    store: &mut WidgetWindowStore,
    selected_room_id: Option<String>,
) -> Vec<WidgetWindowState> {
    for bubble_type in QA_ALL_WIDGET_BUBBLES {
        let widget = store
            .bubbles
            .entry(bubble_type.to_string())
            .or_insert_with(|| {
                default_widget_window_state(bubble_type, Some(bubble_type.to_string()))
            });
        widget.selected_room_id = selected_room_id.clone();
        if !widget.window_visible {
            widget.mode = "MINIMIZED".to_string();
            widget.click_through = false;
            widget.dock_orb_visible = false;
        }
    }

    widget_bar_items_from_store(store)
}

#[tauri::command]
fn seed_widget_bar_items(
    app: AppHandle,
    state: tauri::State<'_, WidgetState>,
    input: Option<WidgetRoomContextInput>,
) -> Result<Vec<WidgetWindowState>, String> {
    let selected_room_id =
        normalize_optional_query_value(input.and_then(|value| value.selected_room_id));
    let existing_window_labels: HashSet<String> = app.webview_windows().keys().cloned().collect();
    let items = {
        let mut guard = state
            .lock()
            .map_err(|_| "widget state lock failed".to_string())?;
        recover_stale_visible_widgets_for_bar(&mut guard, &existing_window_labels);
        seed_widget_bar_items_for_store(&mut guard, selected_room_id)
    };
    persist_widget_window_state(&app, &state)?;
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
    persist_widget_window_state(&app, &state)?;

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
        let mut guard = state
            .lock()
            .map_err(|_| "widget state lock failed".to_string())?;
        for widget in guard.bubbles.values_mut() {
            widget.monitor_id = if requested_monitor_id == PRIMARY_MONITOR_ID {
                None
            } else {
                Some(requested_monitor_id.clone())
            };
        }
        guard.bubbles.values().cloned().collect()
    };
    persist_widget_window_state(&app, &state)?;

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
        apply_widget_window_mode_update(widget, mode, selected_room_id.clone());
    })?;
    if widget.mode == "MINIMIZED" && !widget_keeps_webview_when_hidden(&widget) {
        ensure_widget_bar_window(&app, &monitor_state, &state)?;
    }
    persist_widget_window_state(&app, &state)?;
    let result = apply_widget_window_state(&app, &monitor_state, &widget)?;
    // 모드 전환 뒤 바 창 상태(가시성)를 동기화한다. 바 크기는 고정이라 리사이즈는 없다.
    refresh_widget_bar_window(&app, &monitor_state, &state)?;
    Ok(result)
}

#[tauri::command]
fn set_widget_window_position(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    input: WidgetWindowPositionInput,
) -> Result<WidgetWindowState, String> {
    let preferred_monitor_id = get_preferred_monitor_id(&monitor_state)?;
    let monitor = resolve_monitor_with_id(&app, &preferred_monitor_id)?;
    let scale = monitor
        .as_ref()
        .map(|(monitor, _)| monitor.scale_factor())
        .unwrap_or(1.0)
        .max(0.5);
    let (work_area_x, work_area_y, work_area_width, work_area_height) =
        monitor_work_area_logical(monitor.as_ref().map(|(monitor, _)| monitor), scale);
    let next_monitor_id = monitor.as_ref().map(|(_, id)| id.clone());

    let widget = with_widget_state(&state, input.bubble_type, input.window_id, |widget| {
        let size = widget_window_size(widget);
        let (x, y) = clamp_widget_local_position(
            widget,
            &size,
            work_area_x,
            work_area_y,
            work_area_width,
            work_area_height,
            input.x as f64,
            input.y as f64,
        );
        widget.position = WidgetWindowPosition {
            x: x.round() as i32,
            y: y.round() as i32,
        };
        widget.monitor_id = next_monitor_id;
    })?;
    persist_widget_window_state(&app, &state)?;
    apply_widget_window_state(&app, &monitor_state, &widget)
}

#[tauri::command]
fn drag_widget_bar_window(
    app: AppHandle,
    window: WebviewWindow,
    state: tauri::State<'_, WidgetState>,
    input: WidgetBarDragInput,
) -> Result<WidgetBarDragResult, String> {
    let label = window.label().to_string();
    if !is_widget_window_label(&label) || !label.ends_with("-bar") {
        return Err("drag_widget_bar_window can only be called from the bar widget".to_string());
    }

    let scale = window
        .scale_factor()
        .map_err(|error| error.to_string())?
        .max(0.5);
    let cursor = window
        .cursor_position()
        .map_err(|error| error.to_string())?;
    let monitor = monitor_nearest_physical_point(&app, cursor.x, cursor.y)?;
    let (origin_x, origin_y, work_x, work_y, work_width, work_height) = if let Some((monitor, _)) =
        monitor.as_ref()
    {
        let origin = monitor.position();
        let work_area = monitor.work_area();
        let dock_guard = macos_dock_guard_physical(monitor, work_area.size.height as f64, scale);
        (
            origin.x as f64,
            origin.y as f64,
            work_area.position.x as f64,
            work_area.position.y as f64,
            work_area.size.width as f64,
            (work_area.size.height as f64 - dock_guard).max(WIDGET_BAR_VISIBLE_HEIGHT * scale),
        )
    } else {
        (
            0.0,
            0.0,
            0.0,
            0.0,
            WIDGET_FALLBACK_MONITOR_WIDTH * scale,
            WIDGET_FALLBACK_MONITOR_HEIGHT * scale,
        )
    };

    let padding = WIDGET_BAR_ROOT_PADDING * scale;
    let grab_x = input.grab_x * scale;
    let grab_y = input.grab_y * scale;
    let nav_width = input.nav_width * scale;
    let nav_height = input.nav_height * scale;
    let root_width = input.root_width * scale;
    let root_height = input.root_height * scale;
    let work_right = work_x + work_width;
    let work_bottom = work_y + work_height;

    let visible_x = (cursor.x - grab_x)
        .max(work_x + padding)
        .min((work_right - nav_width - padding).max(work_x + padding));
    let visible_y = (cursor.y - grab_y)
        .max(work_y + padding)
        .min((work_bottom - nav_height - padding).max(work_y + padding));
    let placement = if visible_y < work_y + bar_preview_flip_threshold_physical(scale) {
        "below"
    } else {
        "above"
    };
    let offset_top = if placement == "below" {
        padding
    } else {
        root_height - nav_height - padding
    };
    let next_x = visible_x + nav_width / 2.0 - root_width / 2.0;
    let next_y = visible_y - offset_top;

    note_widget_window_moved(&label);
    window
        .set_position(Position::Physical(PhysicalPosition::new(
            next_x.round() as i32,
            next_y.round() as i32,
        )))
        .map_err(|error| error.to_string())?;

    let widget = with_widget_state(
        &state,
        Some("bar".to_string()),
        Some("bar".to_string()),
        |widget| {
            widget.position = WidgetWindowPosition {
                x: ((next_x - origin_x) / scale).round() as i32,
                y: ((next_y - origin_y) / scale).round() as i32,
            };
            widget.monitor_id = monitor.as_ref().map(|(_, id)| id.clone());
        },
    )?;
    persist_widget_window_state(&app, &state)?;

    Ok(WidgetBarDragResult {
        placement: placement.to_string(),
        state: widget,
    })
}

#[tauri::command]
fn set_widget_bar_preview_placement(
    app: AppHandle,
    window: WebviewWindow,
    state: tauri::State<'_, WidgetState>,
    input: WidgetBarPreviewPlacementInput,
) -> Result<WidgetBarDragResult, String> {
    let label = window.label().to_string();
    if !is_widget_window_label(&label) || !label.ends_with("-bar") {
        return Err(
            "set_widget_bar_preview_placement can only be called from the bar widget".to_string(),
        );
    }
    if input.placement != "above" && input.placement != "below" {
        return Err("widget bar preview placement must be above or below".to_string());
    }

    let scale = window
        .scale_factor()
        .map_err(|error| error.to_string())?
        .max(0.5);
    let current_position = window.outer_position().map_err(|error| error.to_string())?;
    let monitor = window
        .current_monitor()
        .map_err(|error| error.to_string())?
        .map(|monitor| {
            let (monitors, _primary) = list_monitors(&app)?;
            let id = monitors
                .iter()
                .enumerate()
                .find(|(_, candidate)| monitors_match(candidate, &monitor))
                .map(|(index, candidate)| monitor_id(candidate, index))
                .unwrap_or_else(|| PRIMARY_MONITOR_ID.to_string());
            Ok::<(Monitor, String), String>((monitor, id))
        })
        .transpose()?;
    let (origin_x, origin_y, work_y, work_height) = if let Some((monitor, _)) = monitor.as_ref() {
        let origin = monitor.position();
        let work_area = monitor.work_area();
        let dock_guard = macos_dock_guard_physical(monitor, work_area.size.height as f64, scale);
        (
            origin.x as f64,
            origin.y as f64,
            work_area.position.y as f64,
            (work_area.size.height as f64 - dock_guard).max(WIDGET_BAR_VISIBLE_HEIGHT * scale),
        )
    } else {
        (0.0, 0.0, 0.0, WIDGET_FALLBACK_MONITOR_HEIGHT * scale)
    };

    let padding = WIDGET_BAR_ROOT_PADDING * scale;
    let nav_height = input.nav_height * scale;
    let work_bottom = work_y + work_height;
    let visible_y = (current_position.y as f64 + input.current_offset_top * scale)
        .max(work_y + padding)
        .min((work_bottom - nav_height - padding).max(work_y + padding));
    let next_y = visible_y - input.next_offset_top * scale;

    note_widget_window_moved(&label);
    window
        .set_position(Position::Physical(PhysicalPosition::new(
            current_position.x,
            next_y.round() as i32,
        )))
        .map_err(|error| error.to_string())?;

    let widget = with_widget_state(
        &state,
        Some("bar".to_string()),
        Some("bar".to_string()),
        |widget| {
            widget.position = WidgetWindowPosition {
                x: ((current_position.x as f64 - origin_x) / scale).round() as i32,
                y: ((next_y - origin_y) / scale).round() as i32,
            };
            widget.monitor_id = monitor.as_ref().map(|(_, id)| id.clone());
        },
    )?;
    persist_widget_window_state(&app, &state)?;

    Ok(WidgetBarDragResult {
        placement: input.placement,
        state: widget,
    })
}

fn bar_preview_flip_threshold_physical(scale: f64) -> f64 {
    #[cfg(target_os = "macos")]
    {
        WIDGET_BAR_HEIGHT * scale
    }

    #[cfg(not(target_os = "macos"))]
    {
        188.0 * scale
    }
}

/// 사용자 코너 드래그 리사이즈. 버블별 [기본 크기, 기본 × 1.6]으로 클램프해 창 크기를
/// 라이브로 바꾸고, commit(드래그 종료)일 때만 SQLite(local_widget_bubble_sizes)에 저장한다.
/// 바/메뉴 창은 리사이즈 대상이 아니다. resizable(false) 창이므로 apply와 같은
/// "min 해제 → max → min → size" 순서로 다시 잠근다(macOS에서 조용한 실패 방지).
#[tauri::command]
fn resize_widget_window(
    app: AppHandle,
    db: tauri::State<'_, local_db::Db>,
    state: tauri::State<'_, WidgetState>,
    input: WidgetWindowResizeInput,
) -> Result<WidgetWindowState, String> {
    let bubble_type = normalize_bubble_type(input.bubble_type.clone());
    if bubble_type == "bar" || bubble_type == "menu" {
        return Err("bar/menu widget windows are not resizable".to_string());
    }
    if !input.width.is_finite() || !input.height.is_finite() {
        return Err("widget size must be finite".to_string());
    }

    let size = clamp_widget_user_size(&bubble_type, input.width, input.height);
    remember_widget_user_size(&bubble_type, &size);

    let widget = with_widget_state(&state, Some(bubble_type.clone()), input.window_id, |_| {})?;
    let label = widget_window_label(&widget);
    if let Some(window) = app.get_webview_window(&label) {
        let size_key = (size.width.round() as i64, size.height.round() as i64);
        let size_changed = with_widget_applied_window_state(&label, |applied| {
            if applied.size == Some(size_key) {
                false
            } else {
                applied.size = Some(size_key);
                true
            }
        })
        .unwrap_or(true);
        if size_changed {
            window
                .set_min_size(None::<Size>)
                .map_err(|error| error.to_string())?;
            window
                .set_max_size(Some(Size::Logical(size)))
                .map_err(|error| error.to_string())?;
            window
                .set_min_size(Some(Size::Logical(size)))
                .map_err(|error| error.to_string())?;
            window
                .set_size(Size::Logical(size))
                .map_err(|error| error.to_string())?;
        }
    }

    if input.commit.unwrap_or(false) {
        let conn = db.0.lock().map_err(|_| "db lock failed".to_string())?;
        local_db::store_widget_bubble_size_for_conn(
            &conn,
            &bubble_type,
            size.width as i64,
            size.height as i64,
        )?;
    }

    Ok(widget)
}

/// 열려 있는 버블 창들을 선호 모니터 우상단 기준 24px 간격, 한 열에 2개씩 그리드로 정렬한다.
/// 바/메뉴 창은 움직이지 않는다. 좌표는 store에 논리·모니터-로컬로 기록/저장하고, 실제 이동은
/// set_position으로 반영한다 — 이어지는 Moved 이벤트가 같은 좌표를 다시 저장한다(기존 영속 경로).
#[tauri::command]
fn arrange_widget_windows(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    input: Option<ArrangeWidgetWindowsInput>,
) -> Result<Vec<WidgetWindowState>, String> {
    let preferred_monitor_id = get_preferred_monitor_id(&monitor_state)?;
    let monitor = resolve_monitor_with_id(&app, &preferred_monitor_id)?;
    let scale = monitor
        .as_ref()
        .map(|(monitor, _)| monitor.scale_factor())
        .unwrap_or(1.0)
        .max(0.5);
    let origin_x = monitor
        .as_ref()
        .map_or(0.0, |(monitor, _)| monitor.position().x as f64 / scale);
    let origin_y = monitor
        .as_ref()
        .map_or(0.0, |(monitor, _)| monitor.position().y as f64 / scale);
    let monitor_width = monitor
        .as_ref()
        .map(|(monitor, _)| monitor.size().width as f64 / scale)
        .unwrap_or(WIDGET_FALLBACK_MONITOR_WIDTH);
    let next_monitor_id = monitor.as_ref().map(|(_, id)| id.clone());

    // 정렬 대상: 바/메뉴 제외, 실제 웹뷰가 떠 있는 보이는 버블 창(계단 인덱스 순 안정 정렬).
    let mut targets: Vec<WidgetWindowState> = {
        let guard = state
            .lock()
            .map_err(|_| "widget state lock failed".to_string())?;
        guard
            .bubbles
            .values()
            .filter(|widget| {
                widget.active_bubble != "bar"
                    && widget.active_bubble != "menu"
                    && widget.window_visible
                    && app
                        .get_webview_window(&widget_window_label(widget))
                        .is_some()
            })
            .cloned()
            .collect()
    };
    targets.sort_by(|left, right| {
        let left_index = widget_default_cascade_index(&left.active_bubble) as i64;
        let right_index = widget_default_cascade_index(&right.active_bubble) as i64;
        left_index.cmp(&right_index).then_with(|| {
            let left_key = left.window_id.as_deref().unwrap_or(&left.active_bubble);
            let right_key = right.window_id.as_deref().unwrap_or(&right.active_bubble);
            left_key.cmp(right_key)
        })
    });

    // 정렬 프리셋: 격자(기본)/세로 한 열/가로 한 줄/계단식.
    let layout = input
        .as_ref()
        .and_then(|value| value.layout.as_deref())
        .unwrap_or("grid");
    let placements = match layout {
        "column" => arrange_widget_column_placements(&targets, monitor_width),
        "row" => arrange_widget_row_placements(&targets, monitor_width),
        "cascade" => arrange_widget_cascade_placements(&targets, monitor_width),
        _ => arrange_widget_grid_placements(&targets, monitor_width),
    };

    // store 좌표 갱신 + 정렬된 위젯 목록 스냅샷.
    let arranged = {
        let mut guard = state
            .lock()
            .map_err(|_| "widget state lock failed".to_string())?;
        for (label, position) in &placements {
            if let Some(widget) = guard
                .bubbles
                .values_mut()
                .find(|widget| widget_window_label(widget) == *label)
            {
                widget.position = position.clone();
                widget.monitor_id = next_monitor_id.clone();
            }
        }
        let placed_labels: HashSet<String> =
            placements.iter().map(|(label, _)| label.clone()).collect();
        let mut arranged: Vec<WidgetWindowState> = guard
            .bubbles
            .values()
            .filter(|widget| placed_labels.contains(&widget_window_label(widget)))
            .cloned()
            .collect();
        arranged.sort_by(|left, right| {
            let left_key = left.window_id.as_deref().unwrap_or(&left.active_bubble);
            let right_key = right.window_id.as_deref().unwrap_or(&right.active_bubble);
            left_key.cmp(right_key)
        });
        arranged
    };
    persist_widget_window_state(&app, &state)?;

    for (label, position) in &placements {
        if let Some(window) = app.get_webview_window(label) {
            // 이동 grace를 미리 열어 커서 폴러가 이동 중 클릭 통과를 켜지 않게 한다.
            note_widget_window_moved(label);
            let logical =
                LogicalPosition::new(origin_x + position.x as f64, origin_y + position.y as f64);
            #[cfg(not(target_os = "macos"))]
            with_widget_applied_window_state(label, |applied| {
                applied.position = Some((logical.x.round() as i64, logical.y.round() as i64));
            });
            window
                .set_position(Position::Logical(logical))
                .map_err(|error| error.to_string())?;
        }
    }

    Ok(arranged)
}

/// 우상단 앵커 그리드 좌표 계산(모니터-로컬 논리 px). 열은 오른쪽에서 왼쪽으로 채우고,
/// 각 열은 위에서 아래로 최대 2개. 열 폭은 그 열에서 가장 넓은 창 기준이다.
fn arrange_widget_grid_placements(
    targets: &[WidgetWindowState],
    monitor_width: f64,
) -> Vec<(String, WidgetWindowPosition)> {
    let mut placements: Vec<(String, WidgetWindowPosition)> = Vec::new();
    let mut column_right = monitor_width - WIDGET_ARRANGE_GAP;

    for column in targets.chunks(WIDGET_ARRANGE_ROWS_PER_COLUMN) {
        let column_width = column
            .iter()
            .map(|widget| widget_window_size(widget).width)
            .fold(0.0_f64, f64::max);
        let column_x = (column_right - column_width).max(WIDGET_ARRANGE_GAP);
        let mut row_y = WIDGET_ARRANGE_GAP;
        for widget in column {
            placements.push((
                widget_window_label(widget),
                WidgetWindowPosition {
                    x: column_x.round() as i32,
                    y: row_y.round() as i32,
                },
            ));
            row_y += widget_window_size(widget).height + WIDGET_ARRANGE_GAP;
        }
        column_right = column_x - WIDGET_ARRANGE_GAP;
    }

    placements
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ArrangeWidgetWindowsInput {
    #[serde(default)]
    layout: Option<String>,
}

/// 세로 정렬: 오른쪽에 한 열로 위→아래로 쌓는다.
fn arrange_widget_column_placements(
    targets: &[WidgetWindowState],
    monitor_width: f64,
) -> Vec<(String, WidgetWindowPosition)> {
    let mut placements: Vec<(String, WidgetWindowPosition)> = Vec::new();
    let column_width = targets
        .iter()
        .map(|widget| widget_window_size(widget).width)
        .fold(0.0_f64, f64::max);
    let column_x = (monitor_width - WIDGET_ARRANGE_GAP - column_width).max(WIDGET_ARRANGE_GAP);
    let mut row_y = WIDGET_ARRANGE_GAP;
    for widget in targets {
        placements.push((
            widget_window_label(widget),
            WidgetWindowPosition {
                x: column_x.round() as i32,
                y: row_y.round() as i32,
            },
        ));
        row_y += widget_window_size(widget).height + WIDGET_ARRANGE_GAP;
    }
    placements
}

/// 가로 정렬: 상단에 한 줄로 왼쪽→오른쪽으로 늘어놓는다.
fn arrange_widget_row_placements(
    targets: &[WidgetWindowState],
    _monitor_width: f64,
) -> Vec<(String, WidgetWindowPosition)> {
    let mut placements: Vec<(String, WidgetWindowPosition)> = Vec::new();
    let mut col_x = WIDGET_ARRANGE_GAP;
    for widget in targets {
        placements.push((
            widget_window_label(widget),
            WidgetWindowPosition {
                x: col_x.round() as i32,
                y: WIDGET_ARRANGE_GAP.round() as i32,
            },
        ));
        col_x += widget_window_size(widget).width + WIDGET_ARRANGE_GAP;
    }
    placements
}

/// 계단식: 오른쪽 위에서 대각선으로 겹쳐 쌓는다(카드 덱 느낌).
fn arrange_widget_cascade_placements(
    targets: &[WidgetWindowState],
    monitor_width: f64,
) -> Vec<(String, WidgetWindowPosition)> {
    let mut placements: Vec<(String, WidgetWindowPosition)> = Vec::new();
    let step = 36.0_f64;
    let base_width = targets
        .iter()
        .map(|widget| widget_window_size(widget).width)
        .fold(0.0_f64, f64::max);
    let base_x = (monitor_width - WIDGET_ARRANGE_GAP - base_width).max(WIDGET_ARRANGE_GAP);
    for (index, widget) in targets.iter().enumerate() {
        let offset = step * index as f64;
        placements.push((
            widget_window_label(widget),
            WidgetWindowPosition {
                x: (base_x - offset).max(WIDGET_ARRANGE_GAP).round() as i32,
                y: (WIDGET_ARRANGE_GAP + offset).round() as i32,
            },
        ));
    }
    placements
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
    persist_widget_window_state(&app, &state)?;
    let payload = WidgetRoomContextChangedPayload { selected_room_id };

    if app.get_webview_window(MAIN_WINDOW_LABEL).is_some() {
        let _ = app.emit_to(
            MAIN_WINDOW_LABEL,
            WIDGET_ROOM_CONTEXT_CHANGED_EVENT,
            payload.clone(),
        );
    }

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

/// 위젯 창 드래그 시작 알림. 커서 폴러의 "최근 이동" grace를 미리 열어,
/// mousedown 직후 첫 Moved 이벤트가 오기 전 구간에서도 클릭 통과가 켜지지 않게 한다.
/// 드래그 중에는 OS가 Moved 이벤트를 계속 보내므로 grace가 mouseup까지 이어진다.
#[tauri::command]
fn notify_widget_drag_started(window: WebviewWindow) -> Result<(), String> {
    note_widget_window_moved(window.label());
    Ok(())
}

/// 웹뷰가 상호작용 표면(data-bubli-interactive) 위에서 실제 마우스 이벤트를 받았다는 힌트.
/// 커서 폴러의 rect 판정이 배율/좌표 드리프트로 어긋나도, 이 힌트가 살아 있는 동안(500ms)은
/// 클릭 통과를 켜지 않아 헤더 드래그·버튼 클릭이 죽지 않는다(좌표 계산에 대한 안전망).
#[tauri::command]
fn notify_widget_pointer_seen(window: WebviewWindow) -> Result<(), String> {
    let label = window.label().to_string();
    if !is_widget_window_label(&label) {
        return Ok(());
    }
    with_widget_pointer_state(&label, |state| {
        state.last_pointer_seen_at = Some(Instant::now());
    });
    Ok(())
}

/// desktop-widget 창이 자기 상호작용 rect(셸/pill/팝오버/메뉴 패널)를 보고한다.
/// 호출한 창(label) 기준으로 저장하고, 해당 창의 커서 폴러를 게으르게 시작한다.
#[tauri::command]
fn set_widget_interactive_rects(
    app: AppHandle,
    window: WebviewWindow,
    input: WidgetInteractiveRectsInput,
) -> Result<(), String> {
    let label = window.label().to_string();
    if !is_widget_window_label(&label) {
        return Ok(());
    }

    with_widget_pointer_state(&label, |state| {
        state.rects = input.rects;
    })
    .ok_or_else(|| "widget pointer state lock failed".to_string())?;
    spawn_widget_pointer_poller(&app, label);
    Ok(())
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
    register_native_widget_shortcut(&app, &input.shortcut)?;
    let widget = with_widget_state(&state, None, None, |widget| {
        widget.shortcut = Some(input.shortcut);
    })?;
    persist_widget_window_state(&app, &state)?;
    Ok(widget)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MainWindowShowInput {
    route: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TauriGoogleOauthLoopbackInput {
    authorize_url: String,
    expected_state: Option<String>,
    redirect_uri: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TauriGoogleCompleteOauthInput {
    api_base_url: String,
    authorize_url: String,
    expected_state: Option<String>,
    redirect_uri: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TauriGoogleOauthLoopbackResult {
    code: String,
    state: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TauriGoogleApiInput {
    api_base_url: String,
    redirect_uri: String,
    state: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TauriGoogleCallbackInput {
    api_base_url: String,
    code: String,
    redirect_uri: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct TauriGoogleAuthorizeResponse {
    authorize_url: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiEnvelope<T> {
    success: bool,
    data: Option<T>,
    error: Option<ApiEnvelopeError>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiEnvelopeError {
    code: Option<String>,
    message: String,
    trace_id: Option<String>,
}

fn normalize_tauri_api_base_url(api_base_url: &str) -> Result<String, String> {
    let trimmed = api_base_url.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err("Tauri API base URL is required".to_string());
    }
    if trimmed.starts_with("https://")
        || trimmed.starts_with("http://localhost:")
        || trimmed.starts_with("http://127.0.0.1:")
    {
        return Ok(trimmed.to_string());
    }

    Err("Tauri API base URL must be HTTPS or a local development URL".to_string())
}

fn parse_api_envelope<T: for<'de> Deserialize<'de>>(
    status: reqwest::StatusCode,
    body: &str,
) -> Result<T, String> {
    let parsed: ApiEnvelope<T> = serde_json::from_str(body)
        .map_err(|error| format!("Tauri auth API returned invalid JSON: {error}"))?;
    if status.is_success() && parsed.success {
        return parsed
            .data
            .ok_or_else(|| "Tauri auth API returned no data".to_string());
    }

    let message = parsed.error.map_or_else(
        || format!("Tauri auth API request failed with HTTP {status}"),
        |error| {
            let code = error.code.unwrap_or_else(|| "UNKNOWN".to_string());
            let trace_id = error.trace_id.unwrap_or_else(|| "no-trace".to_string());
            format!(
                "{} [{code}, traceId={trace_id}, HTTP {status}]",
                error.message
            )
        },
    );
    Err(message)
}

#[tauri::command]
fn get_tauri_google_authorization_url(
    input: TauriGoogleApiInput,
) -> Result<TauriGoogleAuthorizeResponse, String> {
    let api_base_url = normalize_tauri_api_base_url(&input.api_base_url)?;
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|error| error.to_string())?;
    let mut request = client
        .get(format!("{api_base_url}/api/auth/google/authorize"))
        .query(&[
            ("clientType", "TAURI"),
            ("redirectUri", input.redirect_uri.as_str()),
        ]);
    if let Some(state) = input.state.as_deref() {
        request = request.query(&[("state", state)]);
    }
    let response = request.send().map_err(|error| error.to_string())?;
    let status = response.status();
    let body = response.text().map_err(|error| error.to_string())?;
    let result: TauriGoogleAuthorizeResponse = parse_api_envelope(status, &body)?;
    validate_google_authorize_url(&result.authorize_url, &input.redirect_uri)?;
    Ok(result)
}

#[tauri::command]
fn callback_tauri_google_oauth(
    input: TauriGoogleCallbackInput,
) -> Result<serde_json::Value, String> {
    let api_base_url = normalize_tauri_api_base_url(&input.api_base_url)?;
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|error| error.to_string())?;
    let response = client
        .post(format!("{api_base_url}/api/auth/google/callback"))
        .json(&serde_json::json!({
            "clientType": "TAURI",
            "code": input.code,
            "redirectUri": input.redirect_uri,
        }))
        .send()
        .map_err(|error| error.to_string())?;
    let status = response.status();
    let body = response.text().map_err(|error| error.to_string())?;
    parse_api_envelope(status, &body)
}

fn build_tauri_auth_session_json(token: &serde_json::Value) -> Result<String, String> {
    let mut session = token
        .as_object()
        .cloned()
        .ok_or_else(|| "Tauri auth token response must be a JSON object".to_string())?;
    let saved_at_ms = local_db::now_ms();
    session.insert(
        "clientType".to_string(),
        serde_json::Value::String("TAURI".to_string()),
    );
    session.insert(
        "savedAt".to_string(),
        serde_json::Value::String(local_db::ms_to_iso(saved_at_ms)),
    );
    session.insert(
        "savedAtMs".to_string(),
        serde_json::Value::Number(saved_at_ms.into()),
    );

    serde_json::to_string(&serde_json::Value::Object(session)).map_err(|error| error.to_string())
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut output = Vec::with_capacity(bytes.len());
    let mut index = 0;

    while index < bytes.len() {
        match bytes[index] {
            b'+' => {
                output.push(b' ');
                index += 1;
            }
            b'%' if index + 2 < bytes.len() => {
                let hex = &input[index + 1..index + 3];
                if let Ok(value) = u8::from_str_radix(hex, 16) {
                    output.push(value);
                    index += 3;
                } else {
                    output.push(bytes[index]);
                    index += 1;
                }
            }
            value => {
                output.push(value);
                index += 1;
            }
        }
    }

    String::from_utf8_lossy(&output).into_owned()
}

fn query_value(query: &str, key: &str) -> Option<String> {
    query.split('&').find_map(|part| {
        let mut pieces = part.splitn(2, '=');
        let raw_key = pieces.next()?;
        if percent_decode(raw_key) != key {
            return None;
        }

        Some(percent_decode(pieces.next().unwrap_or_default()))
    })
}

fn query_value_from_url(url: &str, key: &str) -> Option<String> {
    let query = url.split_once('?')?.1.split('#').next().unwrap_or_default();
    query_value(query, key)
}

fn validate_google_authorize_url(authorize_url: &str, redirect_uri: &str) -> Result<(), String> {
    if authorize_url.chars().any(char::is_whitespace) {
        return Err("Google authorize URL must not contain whitespace".to_string());
    }

    if !authorize_url.starts_with("https://accounts.google.com/o/oauth2/v2/auth?") {
        return Err("Google authorize URL must target accounts.google.com OAuth".to_string());
    }

    let Some(url_redirect_uri) = query_value_from_url(authorize_url, "redirect_uri") else {
        return Err("Google authorize URL is missing redirect_uri".to_string());
    };

    if url_redirect_uri != redirect_uri {
        return Err(
            "Google authorize redirect_uri does not match the loopback listener".to_string(),
        );
    }

    Ok(())
}

/// 로그인 루프백 결과 페이지(외부 브라우저에 뜨는 화면)를 앱 디자인 톤(Sky Opal)으로 렌더한다.
/// 외부 브라우저라 앱 CSS를 못 쓰므로 모든 스타일을 인라인으로 담는다.
fn oauth_result_page(title: &str, message: &str, hint: &str, ok: bool) -> String {
    let icon_bg = if ok {
        "linear-gradient(135deg,rgba(216,240,255,0.95),rgba(220,216,248,0.85))"
    } else {
        "linear-gradient(135deg,rgba(255,225,231,0.95),rgba(255,236,214,0.85))"
    };
    let icon = if ok {
        "<svg viewBox='0 0 24 24' fill='none' stroke='#3A78B8' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'><path d='M20 6 9 17l-5-5'/></svg>"
    } else {
        "<svg viewBox='0 0 24 24' fill='none' stroke='#C4587A' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'><path d='M12 8v5'/><path d='M12 16.5h0.01'/></svg>"
    };
    let hint_html = if hint.is_empty() {
        String::new()
    } else {
        format!("<p class='hint'>{hint}</p>")
    };
    format!(
        "<!doctype html><html lang='ko'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Bubli</title><style>\
*{{box-sizing:border-box;margin:0}}html,body{{height:100%}}\
body{{display:grid;place-items:center;padding:24px;font-family:'Pretendard',system-ui,-apple-system,'Segoe UI',sans-serif;color:#23303B;background:radial-gradient(1200px 700px at 50% -12%,#EAF3FC 0%,#F5F9FD 46%,#FBFCFE 100%)}}\
.card{{width:min(420px,100%);text-align:center;padding:40px 32px;border-radius:26px;background:rgba(255,255,255,0.82);border:1px solid rgba(213,228,240,0.72);box-shadow:0 26px 60px -34px rgba(47,124,193,0.34),inset 0 1px 0 rgba(255,255,255,0.9);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}}\
.brand{{font-size:22px;font-weight:860;letter-spacing:-0.01em;background:linear-gradient(105deg,#3A78B8,#6FB8F2 58%,#6E63B8);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}}\
.mark{{width:58px;height:58px;margin:22px auto 18px;display:grid;place-items:center;border-radius:18px;background:{icon_bg};box-shadow:inset 0 1px 0 rgba(255,255,255,0.9)}}\
.mark svg{{width:28px;height:28px}}\
h1{{font-size:20px;font-weight:820;letter-spacing:-0.01em;margin-bottom:10px}}\
p{{font-size:14.5px;line-height:1.62;color:#5B6B7A;word-break:keep-all}}\
.hint{{margin-top:8px;font-size:13px;color:#93A2B1}}\
</style></head><body><main class='card'><div class='brand'>Bubli</div><div class='mark'>{icon}</div><h1>{title}</h1><p>{message}</p>{hint_html}</main></body></html>"
    )
}

fn oauth_response_html(message: &str) -> String {
    format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n{}",
        oauth_result_page(
            "로그인 완료",
            message,
            "이 창을 닫고 Bubli 앱으로 돌아가세요.",
            true
        )
    )
}

fn oauth_error_html(message: &str) -> String {
    format!(
        "HTTP/1.1 400 Bad Request\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n{}",
        oauth_result_page("로그인 실패", message, "", false)
    )
}

fn parse_tauri_oauth_callback_request_line(
    request_line: &str,
    expected_state: Option<&str>,
) -> Result<TauriGoogleOauthLoopbackResult, String> {
    let path_and_query = request_line
        .strip_prefix("GET ")
        .and_then(|line| line.split_whitespace().next())
        .ok_or_else(|| "Tauri OAuth loopback received an invalid request".to_string())?;
    let (path, query) = path_and_query
        .split_once('?')
        .unwrap_or((path_and_query, ""));
    if path != TAURI_OAUTH_LOOPBACK_PATH {
        return Err("Tauri OAuth loopback received an invalid callback path".to_string());
    }

    let code = query_value(query, "code").unwrap_or_default();
    let state = query_value(query, "state");
    let error = query_value(query, "error");
    if let Some(error) = error {
        return Err(format!("Google OAuth returned an error: {error}"));
    }
    if code.trim().is_empty() {
        return Err("Tauri OAuth loopback callback did not include code".to_string());
    }
    if let Some(expected_state) = expected_state {
        if state.as_deref() != Some(expected_state) {
            return Err("Tauri OAuth loopback state mismatch".to_string());
        }
    }

    Ok(TauriGoogleOauthLoopbackResult { code, state })
}

fn focus_main_window_after_oauth_callback(app: &AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return;
    };

    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

#[tauri::command]
fn start_tauri_google_oauth_loopback(
    app: AppHandle,
    input: TauriGoogleOauthLoopbackInput,
) -> Result<TauriGoogleOauthLoopbackResult, String> {
    if input.redirect_uri
        != format!("http://{TAURI_OAUTH_LOOPBACK_BIND}{TAURI_OAUTH_LOOPBACK_PATH}")
    {
        return Err("Tauri OAuth loopback redirect URI is not allowed".to_string());
    }
    validate_google_authorize_url(&input.authorize_url, &input.redirect_uri)?;

    let listener = TcpListener::bind(TAURI_OAUTH_LOOPBACK_BIND)
        .map_err(|error| format!("could not bind Tauri OAuth loopback listener: {error}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|error| error.to_string())?;

    tauri_plugin_opener::open_url(&input.authorize_url, None::<&str>)
        .map_err(|error| error.to_string())?;

    let started_at = Instant::now();
    loop {
        if started_at.elapsed() > Duration::from_millis(TAURI_OAUTH_LOOPBACK_TIMEOUT_MS) {
            return Err("Tauri OAuth loopback timed out".to_string());
        }

        match listener.accept() {
            Ok((mut stream, _address)) => {
                let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
                let mut buffer = [0_u8; 8192];
                let bytes_read = stream
                    .read(&mut buffer)
                    .map_err(|error| error.to_string())?;
                let request = String::from_utf8_lossy(&buffer[..bytes_read]);
                let request_line = request.lines().next().unwrap_or_default();
                let parsed = parse_tauri_oauth_callback_request_line(
                    request_line,
                    input.expected_state.as_deref(),
                );
                match parsed {
                    Ok(result) => {
                        let _ = stream
                            .write_all(oauth_response_html("로그인이 확인됐어요.").as_bytes());
                        focus_main_window_after_oauth_callback(&app);
                        return Ok(result);
                    }
                    Err(error) => {
                        let message = if error.contains("invalid callback path") {
                            "Invalid Bubli login callback path."
                        } else if error.contains("did not include code") {
                            "Google login code was missing."
                        } else if error.contains("state mismatch") {
                            "Login state did not match the Bubli app request."
                        } else if error.contains("Google OAuth returned an error") {
                            "Google login was not completed."
                        } else {
                            "Bubli login callback could not be processed."
                        };
                        let _ = stream.write_all(oauth_error_html(message).as_bytes());
                        return Err(error);
                    }
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(50));
            }
            Err(error) => return Err(error.to_string()),
        }
    }
}

#[tauri::command]
fn complete_tauri_google_oauth(
    app: AppHandle,
    db: tauri::State<'_, local_db::Db>,
    input: TauriGoogleCompleteOauthInput,
) -> Result<serde_json::Value, String> {
    let result = start_tauri_google_oauth_loopback(
        app.clone(),
        TauriGoogleOauthLoopbackInput {
            authorize_url: input.authorize_url,
            expected_state: input.expected_state,
            redirect_uri: input.redirect_uri.clone(),
        },
    )?;
    let token = callback_tauri_google_oauth(TauriGoogleCallbackInput {
        api_base_url: input.api_base_url,
        code: result.code,
        redirect_uri: input.redirect_uri,
    })?;
    let session_json = build_tauri_auth_session_json(&token)?;
    local_db::store_tauri_auth_session(
        db,
        local_db::AuthSessionStoreInput {
            session_json: session_json.clone(),
        },
    )?;
    focus_main_window_after_oauth_callback(&app);
    Ok(token)
}

#[tauri::command]
fn open_onboarding_overlay(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
) -> Result<(), String> {
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        let _ = monitor_state;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        if let Some(window) = app.get_webview_window(ONBOARDING_OVERLAY_WINDOW_LABEL) {
            let _ = window.unminimize();
            let _ = window.show();
            return window.set_focus().map_err(|error| error.to_string());
        }

        let (position, size) = onboarding_overlay_window_geometry(&app, &monitor_state)?;
        let window = WebviewWindowBuilder::new(
            &app,
            ONBOARDING_OVERLAY_WINDOW_LABEL,
            WebviewUrl::App(ONBOARDING_OVERLAY_WINDOW_URL.into()),
        )
        .title("Bubli onboarding")
        .inner_size(size.width, size.height)
        .min_inner_size(size.width, size.height)
        .max_inner_size(size.width, size.height)
        .position(position.x, position.y)
        .decorations(false)
        .transparent(true)
        .background_color(Color(0, 0, 0, 0))
        .devtools(false)
        .shadow(false)
        .resizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(true)
        .visible(true)
        .build()
        .map_err(|error| error.to_string())?;

        window
            .set_ignore_cursor_events(false)
            .map_err(|error| error.to_string())?;

        Ok(())
    }
}

#[tauri::command]
fn close_onboarding_overlay(app: AppHandle) -> Result<(), String> {
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        let Some(window) = app.get_webview_window(ONBOARDING_OVERLAY_WINDOW_LABEL) else {
            return Ok(());
        };

        window.close().map_err(|error| error.to_string())
    }
}

/// 위젯 메뉴에서 메인 앱을 열 때 이동을 허용하는 경로 화이트리스트.
fn normalize_widget_menu_route(route: Option<String>) -> Option<&'static str> {
    match route.as_deref() {
        Some("settings") => Some("/app/settings"),
        _ => None,
    }
}

#[tauri::command]
fn show_main_window(app: AppHandle, input: Option<MainWindowShowInput>) -> Result<(), String> {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return Err("main window not found".to_string());
    };

    if let Some(route) = normalize_widget_menu_route(input.and_then(|value| value.route)) {
        window
            .eval(&format!("window.location.assign(\"{route}\")"))
            .map_err(|error| error.to_string())?;
    }

    let _ = window.unminimize();
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
fn quit_app(app: AppHandle, state: tauri::State<'_, WidgetState>) -> Result<(), String> {
    persist_widget_window_state(&app, &state)?;
    destroy_all_widget_windows(&app);
    app.exit(0);
    Ok(())
}

fn app_ready_qa_all_widgets_requested(input: &Option<AppReadyInput>) -> bool {
    input
        .as_ref()
        .and_then(|value| value.qa_all_widgets)
        .unwrap_or(false)
}

fn app_ready_surface_ready_only(input: &Option<AppReadyInput>) -> bool {
    input
        .as_ref()
        .and_then(|value| value.surface_ready_only)
        .unwrap_or(false)
}

#[tauri::command]
fn app_ready(
    app: AppHandle,
    window: WebviewWindow,
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    input: Option<AppReadyInput>,
) -> Result<&'static str, String> {
    let qa_all_widgets = app_ready_qa_all_widgets_requested(&input);
    let surface_ready_only = app_ready_surface_ready_only(&input);
    let selected_room_id = input
        .as_ref()
        .and_then(|value| normalize_optional_query_value(value.selected_room_id.clone()));
    if qa_all_widgets && qa_all_widget_windows_enabled() {
        build_widget_qa_windows(&app, selected_room_id)?;
        return Ok("bubli-tauri-ready");
    }

    let label = window.label().to_string();
    if is_widget_window_label(&label) {
        mark_widget_window_dom_ready(&label);
        window
            .set_background_color(Some(Color(0, 0, 0, 0)))
            .map_err(|error| error.to_string())?;

        if surface_ready_only {
            return Ok("bubli-tauri-ready");
        }

        let widget = {
            let guard = state
                .lock()
                .map_err(|_| "widget state lock failed".to_string())?;
            guard
                .bubbles
                .values()
                .find(|widget| widget_window_label(widget) == label)
                .cloned()
        };

        if let Some(widget) = widget {
            apply_widget_window_state(&app, &monitor_state, &widget)?;
        } else if !window.is_visible().unwrap_or(false) {
            window.show().map_err(|error| error.to_string())?;
        }
    }

    Ok("bubli-tauri-ready")
}

#[tauri::command]
fn get_authenticated_surfaces_enabled(
    auth_state: tauri::State<'_, AuthenticatedSurfacesState>,
) -> Result<bool, String> {
    authenticated_surfaces_enabled(&auth_state)
}

#[tauri::command]
fn set_authenticated_surfaces_enabled(
    auth_state: tauri::State<'_, AuthenticatedSurfacesState>,
    input: AuthenticatedSurfacesInput,
) -> Result<bool, String> {
    let mut enabled = auth_state
        .lock()
        .map_err(|_| "authenticated surfaces state lock failed".to_string())?;
    *enabled = input.enabled;
    Ok(*enabled)
}

fn prepare_open_widget_window(
    app: &AppHandle,
    state: &WidgetState,
    input: WidgetWindowOpenInput,
) -> Result<WidgetWindowState, String> {
    let bubble_type = normalize_bubble_type(input.bubble_type);
    let window_id = input.window_id;
    let selected_room_id = normalize_optional_query_value(input.selected_room_id);
    let next_mode = input
        .mode
        .map(normalize_widget_mode)
        .unwrap_or_else(|| "DEFAULT".to_string());
    let widget = with_widget_state(state, Some(bubble_type), window_id, |widget| {
        apply_open_widget_window_update(widget, next_mode.clone(), selected_room_id.clone());
    })?;

    let canonical_label = widget_window_label(&widget);
    let stale_label_prefix = format!("{canonical_label}-");
    for (label, window) in app.webview_windows() {
        if label != canonical_label && label.starts_with(&stale_label_prefix) {
            reset_widget_window_dom_ready(&label);
            reset_widget_applied_window_state(&label);
            let _ = window.destroy();
        }
    }

    Ok(widget)
}

#[tauri::command]
async fn open_widget_window(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    auth_state: tauri::State<'_, AuthenticatedSurfacesState>,
    input: Option<WidgetWindowOpenInput>,
) -> Result<WidgetWindowState, String> {
    require_authenticated_surfaces_enabled(&auth_state)?;
    let widget = prepare_open_widget_window(&app, &state, input.unwrap_or_default())?;
    persist_widget_window_state(&app, &state)?;
    let result = schedule_widget_window_build_and_raise(&app, &monitor_state, &widget)?;
    // 바에서 버블을 복원한 뒤 바 창 상태(가시성)를 동기화한다. 바 크기는 고정이라 리사이즈는 없다.
    refresh_widget_bar_window(&app, &monitor_state, &state)?;
    Ok(result)
}

fn snapshot_widget_window_store(state: &WidgetState) -> Result<WidgetWindowStore, String> {
    let guard = state
        .lock()
        .map_err(|_| "widget state lock failed".to_string())?;
    Ok(guard.clone())
}

fn restore_widget_window_store(
    app: &AppHandle,
    state: &WidgetState,
    snapshot: WidgetWindowStore,
) -> Result<(), String> {
    {
        let mut guard = state
            .lock()
            .map_err(|_| "widget state lock failed".to_string())?;
        *guard = snapshot;
    }
    persist_widget_window_state(app, state)
}

fn snapshot_widget_for_label(
    snapshot: &WidgetWindowStore,
    label: &str,
) -> Option<WidgetWindowState> {
    snapshot
        .bubbles
        .values()
        .find(|widget| widget_window_label(widget) == label)
        .cloned()
}

fn rollback_open_widget_windows_failure(
    app: &AppHandle,
    monitor_state: &AppMonitorState,
    state: &WidgetState,
    snapshot: WidgetWindowStore,
    widgets: &[WidgetWindowState],
    error: String,
) -> String {
    if let Err(rollback_error) = restore_widget_window_store(app, state, snapshot.clone()) {
        eprintln!("failed to restore widget store after batch open failure: {rollback_error}");
    }

    let mut restored_labels = HashSet::new();
    for widget in widgets {
        let label = widget_window_label(widget);
        if !restored_labels.insert(label.clone()) {
            continue;
        }

        if let Some(restored_widget) = snapshot_widget_for_label(&snapshot, &label) {
            if let Err(restore_error) =
                apply_widget_window_state(app, monitor_state, &restored_widget)
            {
                eprintln!("failed to restore widget window {label} after batch open failure: {restore_error}");
            }
        } else if let Some(window) = app.get_webview_window(&label) {
            reset_widget_window_dom_ready(&label);
            reset_widget_applied_window_state(&label);
            if let Err(destroy_error) = window.destroy() {
                eprintln!("failed to destroy widget window {label} after batch open failure: {destroy_error}");
            }
        }
    }

    error
}

#[tauri::command]
async fn open_widget_windows(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    auth_state: tauri::State<'_, AuthenticatedSurfacesState>,
    input: WidgetWindowsOpenInput,
) -> Result<Vec<WidgetWindowState>, String> {
    require_authenticated_surfaces_enabled(&auth_state)?;

    let snapshot = snapshot_widget_window_store(&state)?;
    let mut widgets = Vec::with_capacity(input.windows.len());
    for window in input.windows {
        let widget = prepare_open_widget_window(&app, &state, window).map_err(|error| {
            rollback_open_widget_windows_failure(
                &app,
                &monitor_state,
                &state,
                snapshot.clone(),
                &widgets,
                error,
            )
        })?;
        widgets.push(widget);
    }

    persist_widget_window_state(&app, &state).map_err(|error| {
        rollback_open_widget_windows_failure(
            &app,
            &monitor_state,
            &state,
            snapshot.clone(),
            &widgets,
            error,
        )
    })?;

    let mut results = Vec::with_capacity(widgets.len());
    for widget in &widgets {
        let result = schedule_widget_window_build_and_raise(&app, &monitor_state, widget).map_err(
            |error| {
                rollback_open_widget_windows_failure(
                    &app,
                    &monitor_state,
                    &state,
                    snapshot.clone(),
                    &widgets,
                    error,
                )
            },
        )?;
        results.push(result);
    }

    refresh_widget_bar_window(&app, &monitor_state, &state).map_err(|error| {
        rollback_open_widget_windows_failure(
            &app,
            &monitor_state,
            &state,
            snapshot,
            &widgets,
            error,
        )
    })?;
    Ok(results)
}

#[tauri::command]
fn close_widget_window(
    app: AppHandle,
    monitor_state: tauri::State<'_, AppMonitorState>,
    state: tauri::State<'_, WidgetState>,
    auth_state: tauri::State<'_, AuthenticatedSurfacesState>,
    input: Option<WidgetWindowTargetInput>,
) -> Result<WidgetWindowState, String> {
    let bubble_type = input.as_ref().and_then(|value| value.bubble_type.clone());
    let window_id = input.and_then(|value| value.window_id);
    let widget = with_widget_state(&state, bubble_type, window_id, |widget| {
        // macOS 메뉴바 테스트에서는 닫기(X)가 네이티브 웹뷰를 내려도 바 복원 항목에 남아야 한다.
        // Windows는 기존 닫기 의미(DEFAULT + hidden)를 유지해 런처에서 다시 여는 흐름을 건드리지 않는다.
        if cfg!(target_os = "macos") {
            widget.mode = "MINIMIZED".to_string();
        } else {
            widget.mode = "DEFAULT".to_string();
        }
        widget.click_through = false;
        widget.dock_orb_visible = false;
        widget.window_visible = false;
    })?;
    if !widget_keeps_webview_when_hidden(&widget) && authenticated_surfaces_enabled(&auth_state)? {
        ensure_widget_bar_window(&app, &monitor_state, &state)?;
    }
    persist_widget_window_state(&app, &state)?;
    if widget_keeps_webview_when_hidden(&widget) {
        apply_widget_window_state(&app, &monitor_state, &widget)
    } else {
        let label = widget_window_label(&widget);
        if let Some(window) = app.get_webview_window(&label) {
            reset_widget_window_dom_ready(&label);
            reset_widget_applied_window_state(&label);
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
    auth_state: tauri::State<'_, AuthenticatedSurfacesState>,
    input: Option<WidgetWindowTargetInput>,
) -> Result<WidgetWindowState, String> {
    let bubble_type = input.as_ref().and_then(|value| value.bubble_type.clone());
    let window_id = input.as_ref().and_then(|value| value.window_id.clone());
    if widget_visibility_after_toggle(&state, bubble_type.clone(), window_id.clone())? {
        require_authenticated_surfaces_enabled(&auth_state)?;
    }
    let widget = with_widget_state(&state, bubble_type, window_id, |widget| {
        widget.window_visible = !widget.window_visible;
        widget.mode = if widget.window_visible {
            "DEFAULT".to_string()
        } else {
            "MINIMIZED".to_string()
        };
        widget.dock_orb_visible = false;
    })?;
    if !widget.window_visible
        && !widget_keeps_webview_when_hidden(&widget)
        && authenticated_surfaces_enabled(&auth_state)?
    {
        ensure_widget_bar_window(&app, &monitor_state, &state)?;
    }
    persist_widget_window_state(&app, &state)?;

    let result = if widget.window_visible {
        build_widget_window(&app, &monitor_state, &widget)?
    } else {
        apply_widget_window_state(&app, &monitor_state, &widget)?
    };
    // 토글 뒤 바 창 상태(가시성)를 동기화한다. 바 크기는 고정이라 리사이즈는 없다.
    refresh_widget_bar_window(&app, &monitor_state, &state)?;
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn widget(active_bubble: &str, window_id: Option<&str>, x: i32, y: i32) -> WidgetWindowState {
        WidgetWindowState {
            active_bubble: active_bubble.to_string(),
            always_on_top: true,
            click_through: false,
            dock_orb_visible: false,
            mode: "DEFAULT".to_string(),
            monitor_id: None,
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
            bar_layout_height: Some(WIDGET_BAR_HEIGHT),
            bubbles: vec![widget("timer", Some("timer*bad"), 144, 188)],
        });

        assert_eq!(store.active_bubble, "timer");
        // 레거시 windowId는 버블 타입 키로 접힌다(버블당 싱글턴 창).
        let restored = store.bubbles.get("timer").expect("normalized widget");
        assert_eq!(restored.active_bubble, "timer");
        assert_eq!(restored.window_id.as_deref(), Some("timer"));
        assert_eq!(restored.position.x, 144);
        assert_eq!(restored.position.y, 188);
    }

    #[test]
    fn widget_layout_restore_shifts_legacy_bar_y_by_height_delta() {
        // barLayoutHeight가 없는 구버전(220) 레이아웃: 바 pill은 창 하단 고정이라
        // 현재 높이와의 델타만큼 y를 위로 당겨 pill 화면 위치를 유지한다.
        let store = widget_window_store_from_layout(StoredWidgetWindowLayout {
            active_bubble: "bar".to_string(),
            bar_layout_height: None,
            bubbles: vec![widget("bar", Some("bar"), 400, 656)],
        });

        let bar = store.bubbles.get("bar").expect("bar widget");
        let delta = (WIDGET_BAR_HEIGHT - WIDGET_BAR_LEGACY_HEIGHT) as i32;
        assert_eq!(bar.position.x, 400);
        assert_eq!(bar.position.y, 656 - delta);

        // 현재 높이로 저장된 레이아웃은 보정하지 않는다.
        let store = widget_window_store_from_layout(StoredWidgetWindowLayout {
            active_bubble: "bar".to_string(),
            bar_layout_height: Some(WIDGET_BAR_HEIGHT),
            bubbles: vec![widget("bar", Some("bar"), 400, 656)],
        });
        assert_eq!(
            store.bubbles.get("bar").expect("bar widget").position.y,
            656
        );
    }

    #[test]
    fn widget_layout_restore_collapses_duplicate_bubble_entries_preferring_visible_one() {
        // 과거 빌드가 남긴 레이아웃: 같은 todo 버블이 "todo"와 "todo-legacy" 두 키로 저장됨
        // — 실사용에서 "오늘 할 일" 창이 두 개 열리던 근원.
        let hidden = WidgetWindowState {
            mode: "MINIMIZED".to_string(),
            window_visible: false,
            ..widget("todo", Some("todo"), 10, 10)
        };
        let visible = widget("todo", Some("todo-legacy"), 240, 64);

        let store = widget_window_store_from_layout(StoredWidgetWindowLayout {
            active_bubble: "todo".to_string(),
            bar_layout_height: Some(WIDGET_BAR_HEIGHT),
            bubbles: vec![hidden, visible],
        });

        assert_eq!(store.bubbles.len(), 1);
        let merged = store.bubbles.get("todo").expect("collapsed widget");
        assert!(merged.window_visible);
        assert_eq!(merged.window_id.as_deref(), Some("todo"));
        assert_eq!(merged.position.x, 240);
        assert_eq!(merged.position.y, 64);
        // label도 캐논 값 하나로 수렴한다.
        assert_eq!(widget_window_label(merged), "bubli-widget-todo");
    }

    #[test]
    fn widget_bar_items_never_contain_duplicate_bubble_chips() {
        let mut store = WidgetWindowStore::default();
        store.bubbles.insert(
            "todo".to_string(),
            WidgetWindowState {
                mode: "MINIMIZED".to_string(),
                window_visible: false,
                ..widget("todo", Some("todo"), 0, 0)
            },
        );
        // 손상된 스토어를 흉내 낸 중복 키(정상 경로에서는 만들어지지 않는다).
        store.bubbles.insert(
            "todo-legacy".to_string(),
            WidgetWindowState {
                mode: "MINIMIZED".to_string(),
                window_visible: false,
                ..widget("todo", Some("todo-legacy"), 0, 0)
            },
        );

        let items = widget_bar_items_from_store(&store);

        assert_eq!(
            items
                .iter()
                .filter(|widget| widget.active_bubble == "todo")
                .count(),
            1
        );
    }

    #[test]
    fn closed_widget_state_remains_restorable_from_bar() {
        let mut store = WidgetWindowStore::default();
        store.bubbles.insert(
            "chat".to_string(),
            WidgetWindowState {
                mode: "MINIMIZED".to_string(),
                window_visible: false,
                ..widget("chat", Some("chat"), 0, 0)
            },
        );
        store.bubbles.insert(
            "memo".to_string(),
            WidgetWindowState {
                mode: "DEFAULT".to_string(),
                window_visible: false,
                ..widget("memo", Some("memo"), 0, 0)
            },
        );

        let items = widget_bar_items_from_store(&store);

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].active_bubble, "chat");
    }

    #[test]
    fn resource_widget_state_remains_restorable_from_bar() {
        let mut store = WidgetWindowStore::default();
        store.bubbles.insert(
            "resource".to_string(),
            WidgetWindowState {
                mode: "MINIMIZED".to_string(),
                window_visible: false,
                ..widget("resource", Some("resource"), 0, 0)
            },
        );

        let items = widget_bar_items_from_store(&store);

        assert_eq!(items.len(), 1);
        assert_eq!(items[0].active_bubble, "resource");
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

    #[test]
    fn authenticated_surface_gate_defaults_closed_and_can_open() {
        let auth_state = Mutex::new(false);

        assert!(require_authenticated_surfaces_enabled(&auth_state).is_err());
        assert!(!authenticated_surfaces_enabled(&auth_state).expect("auth state"));

        *auth_state.lock().expect("auth state lock") = true;

        assert!(require_authenticated_surfaces_enabled(&auth_state).is_ok());
        assert!(authenticated_surfaces_enabled(&auth_state).expect("auth state"));

        *auth_state.lock().expect("auth state lock") = false;

        assert!(require_authenticated_surfaces_enabled(&auth_state).is_err());
        assert!(!authenticated_surfaces_enabled(&auth_state).expect("auth state"));
    }

    #[test]
    fn widget_toggle_visibility_helper_predicts_show_before_mutation() {
        let state = Mutex::new(WidgetWindowStore::default());

        assert!(
            widget_visibility_after_toggle(&state, Some("todo".to_string()), None)
                .expect("toggle visibility")
        );

        let _ = with_widget_state(&state, Some("todo".to_string()), None, |widget| {
            widget.window_visible = true;
        })
        .expect("widget state");

        assert!(
            !widget_visibility_after_toggle(&state, Some("todo".to_string()), None)
                .expect("toggle visibility")
        );
    }

    #[test]
    fn windows_widget_uses_component_shadow_instead_of_native_shadow() {
        assert_eq!(widget_native_shadow_enabled(), !cfg!(target_os = "windows"));
    }

    #[test]
    fn windows_widget_waits_for_dom_ready_before_first_show() {
        let label = "bubli-widget-ready-test";
        reset_widget_window_dom_ready(label);
        assert_eq!(
            widget_window_dom_ready(label),
            !widget_waits_for_dom_ready_before_show()
        );

        mark_widget_window_dom_ready(label);
        assert!(widget_window_dom_ready(label));
        reset_widget_window_dom_ready(label);
    }

    #[test]
    fn widget_build_starts_hidden_when_dom_ready_gate_is_required() {
        let mut widget = default_widget_window_state("todo", Some("todo".to_string()));
        widget.window_visible = true;

        assert_eq!(
            widget_initial_visible_on_build(&widget),
            !widget_waits_for_dom_ready_before_show()
        );

        widget.window_visible = false;
        assert!(!widget_initial_visible_on_build(&widget));
    }

    #[test]
    fn windows_widget_unminimizes_without_forcing_focus() {
        assert_eq!(
            widget_unminimizes_before_show(),
            cfg!(target_os = "windows")
        );
        assert!(!widget_should_unminimize_before_show(true));
        assert_eq!(
            widget_should_unminimize_before_show(false),
            cfg!(target_os = "windows")
        );
    }

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
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(AppMonitorPreferenceStore::default()))
        .manage(Mutex::new(WidgetWindowStore::default()))
        .manage(Mutex::new(false))
        .manage(local_files::ManagedFolderWatchers::default())
        .setup(|app| {
            // Open the on-device SQLite store (folder index, widget usage,
            // activity focus, sync outbox) and expose it as managed state.
            let connection =
                local_db::open_and_migrate(app.handle()).map_err(|error| error.to_string())?;
            // 사용자 리사이즈 크기(local_widget_bubble_sizes)를 읽어 창 크기 계산에 반영한다.
            // 저장 이후 기본 크기가 바뀌었을 수 있으므로 로드 시점에 다시 클램프한다.
            match local_db::read_widget_bubble_sizes_for_conn(&connection) {
                Ok(sizes) => {
                    for (bubble_type, width, height) in sizes {
                        let clamped =
                            clamp_widget_user_size(&bubble_type, width as f64, height as f64);
                        remember_widget_user_size(&bubble_type, &clamped);
                    }
                }
                Err(error) => {
                    eprintln!("failed to load widget bubble sizes: {error}");
                }
            }
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
            arrange_widget_windows,
            close_all_widget_windows,
            close_widget_window,
            drag_widget_bar_window,
            get_authenticated_surfaces_enabled,
            get_widget_bar_items,
            get_preferred_app_monitor,
            get_tauri_google_authorization_url,
            get_widget_window_state,
            list_app_monitors,
            notify_widget_drag_started,
            notify_widget_pointer_seen,
            open_external_url,
            open_main_window_route,
            open_widget_window,
            open_widget_windows,
            quit_app,
            register_widget_shortcut,
            resize_widget_window,
            seed_widget_bar_items,
            set_authenticated_surfaces_enabled,
            show_main_window,
            callback_tauri_google_oauth,
            complete_tauri_google_oauth,
            start_tauri_google_oauth_loopback,
            set_widget_bar_preview_placement,
            open_onboarding_overlay,
            close_onboarding_overlay,
            set_preferred_app_monitor,
            set_widget_always_on_top,
            set_widget_click_through,
            set_widget_interactive_rects,
            set_widget_room_context,
            set_widget_window_mode,
            set_widget_window_position,
            toggle_widget_window,
            toggle_widget_dock_orb,
            update_widget_tray_state,
            // BUBLI-44 activity context
            activity::read_activity_context,
            activity::set_activity_context_consent,
            // BUBLI-41 widget usage events + rollups + server-sync staging
            widget_usage::record_widget_usage_event,
            widget_usage::rollup_widget_usage,
            widget_usage::sync_widget_usage_summary,
            widget_usage::mark_widget_usage_summary_synced,
            widget_usage::mark_widget_usage_summary_failed,
            // BUBLI-43 local file index + change events + sync outbox
            local_files::list_managed_folders,
            local_files::select_managed_folder,
            local_files::get_index_progress,
            local_files::set_folder_sync,
            local_files::remove_managed_folder,
            local_files::scan_managed_folder,
            local_files::watch_managed_folder,
            local_files::search_local_files,
            local_files::find_local_file_by_resource_id,
            local_files::read_local_file_preview,
            local_files::extract_local_file_key_sentences,
            local_files::open_local_file,
            local_files::reindex_file,
            local_files::flush_sync_outbox,
            local_files::get_local_file_analysis_status,
            local_files::stage_local_file_events_for_sync,
            local_files::mark_local_file_events_synced,
            local_files::stage_local_file_analysis_backfill,
            local_files::mark_local_file_analyses_sent,
            local_files::unwatch_all_managed_folders,
            local_files::watch_all_managed_folders,
            // Local SQLite lifecycle + cache recovery commands.
            local_db::backup_local_sqlite,
            local_db::check_local_sqlite_integrity,
            local_db::clear_active_project_room,
            local_db::clear_tauri_auth_session,
            local_db::get_or_create_widget_usage_device_id,
            local_db::list_local_sqlite_backups,
            local_db::mark_activity_context_synced,
            local_db::read_active_project_room,
            local_db::read_tauri_auth_session,
            local_db::read_widget_pref,
            local_db::read_widget_summary_cache,
            local_db::record_activity_context,
            local_db::record_timer_state,
            local_db::recover_timer_state,
            local_db::read_room_messages,
            local_db::stage_activity_contexts_for_sync,
            local_db::store_active_project_room,
            local_db::store_tauri_auth_session,
            local_db::store_widget_pref,
            local_db::store_widget_summary_cache,
            local_db::restore_local_sqlite_backup,
            local_db::sync_room_messages
        ])
        .build(tauri::generate_context!())
        .expect("failed to build Bubli Tauri application");

    app.run(|app_handle, event| match event {
        tauri::RunEvent::Ready => {
            if local_auto_sync_runtime_smoke_requested() {
                hide_main_window_for_local_auto_sync_smoke(app_handle);
                return;
            }

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
            surface_ready_only: None,
        })));
        assert!(!app_ready_qa_all_widgets_requested(&Some(AppReadyInput {
            qa_all_widgets: Some(false),
            selected_room_id: None,
            surface_ready_only: Some(true),
        })));
        assert!(app_ready_qa_all_widgets_requested(&Some(AppReadyInput {
            qa_all_widgets: Some(true),
            selected_room_id: None,
            surface_ready_only: None,
        })));
    }

    #[test]
    fn app_ready_surface_ready_only_defaults_off_unless_explicitly_requested() {
        assert!(!app_ready_surface_ready_only(&None));
        assert!(!app_ready_surface_ready_only(&Some(AppReadyInput {
            qa_all_widgets: None,
            selected_room_id: None,
            surface_ready_only: None,
        })));
        assert!(!app_ready_surface_ready_only(&Some(AppReadyInput {
            qa_all_widgets: Some(true),
            selected_room_id: None,
            surface_ready_only: Some(false),
        })));
        assert!(app_ready_surface_ready_only(&Some(AppReadyInput {
            qa_all_widgets: None,
            selected_room_id: Some("room-1".to_string()),
            surface_ready_only: Some(true),
        })));
    }

    #[test]
    fn main_window_route_allows_only_app_internal_routes() {
        assert_eq!(
            normalize_main_window_route("app/project-rooms/room-1/work").as_deref(),
            Ok("/app/project-rooms/room-1/work")
        );
        assert_eq!(
            normalize_main_window_route("/app/calendar?roomId=room-1").as_deref(),
            Ok("/app/calendar?roomId=room-1")
        );
        assert!(normalize_main_window_route("/app/chat").is_err());
        assert!(normalize_main_window_route("/app/chat?roomId=room-1").is_err());
        assert!(normalize_main_window_route("/app/project-rooms/room-1/chat").is_err());
        assert!(normalize_main_window_route("/app/project-rooms/room-1/chat?mode=room").is_err());
        assert!(normalize_main_window_route("https://example.com/app").is_err());
        assert!(normalize_main_window_route("//example.com/app").is_err());
        assert!(normalize_main_window_route("javascript:alert(1)").is_err());
        assert!(normalize_main_window_route("/login").is_err());
    }

    #[test]
    fn tauri_oauth_authorize_url_must_target_google_and_loopback_redirect() {
        let redirect_uri = "http://127.0.0.1:3791/auth/callback";
        let authorize_url = "https://accounts.google.com/o/oauth2/v2/auth?client_id=client&redirect_uri=http%3A%2F%2F127.0.0.1%3A3791%2Fauth%2Fcallback&state=abc";

        assert!(validate_google_authorize_url(authorize_url, redirect_uri).is_ok());
        assert!(validate_google_authorize_url("https://example.com/o/oauth2/v2/auth?redirect_uri=http%3A%2F%2F127.0.0.1%3A3791%2Fauth%2Fcallback", redirect_uri).is_err());
        assert!(validate_google_authorize_url(
            authorize_url,
            "http://127.0.0.1:3792/auth/callback"
        )
        .is_err());
        assert_eq!(
            query_value_from_url(authorize_url, "redirect_uri").as_deref(),
            Some(redirect_uri)
        );
    }

    #[test]
    fn tauri_oauth_callback_request_line_requires_valid_path_code_and_state() {
        let parsed = parse_tauri_oauth_callback_request_line(
            "GET /auth/callback?code=abc123&state=nonce-1 HTTP/1.1",
            Some("nonce-1"),
        )
        .expect("valid callback");

        assert_eq!(parsed.code, "abc123");
        assert_eq!(parsed.state.as_deref(), Some("nonce-1"));

        assert!(parse_tauri_oauth_callback_request_line(
            "GET /wrong/callback?code=abc123&state=nonce-1 HTTP/1.1",
            Some("nonce-1"),
        )
        .expect_err("invalid path")
        .contains("invalid callback path"));
        assert!(parse_tauri_oauth_callback_request_line(
            "GET /auth/callback?state=nonce-1 HTTP/1.1",
            Some("nonce-1"),
        )
        .expect_err("missing code")
        .contains("did not include code"));
        assert!(parse_tauri_oauth_callback_request_line(
            "GET /auth/callback?code=abc123&state=other HTTP/1.1",
            Some("nonce-1"),
        )
        .expect_err("state mismatch")
        .contains("state mismatch"));
        assert!(parse_tauri_oauth_callback_request_line(
            "GET /auth/callback?error=access_denied&state=nonce-1 HTTP/1.1",
            Some("nonce-1"),
        )
        .expect_err("google error")
        .contains("Google OAuth returned an error"));
    }

    #[test]
    fn widget_window_mode_without_room_id_preserves_existing_room_context() {
        let mut widget = WidgetWindowState {
            selected_room_id: Some("room-1".to_string()),
            ..default_widget_window_state("todo", Some("todo".to_string()))
        };

        apply_widget_window_mode_update(&mut widget, "MINIMIZED".to_string(), None);

        assert_eq!(widget.mode, "MINIMIZED");
        assert_eq!(widget.selected_room_id.as_deref(), Some("room-1"));

        apply_widget_window_mode_update(
            &mut widget,
            "DEFAULT".to_string(),
            Some("room-2".to_string()),
        );

        assert_eq!(widget.selected_room_id.as_deref(), Some("room-2"));
    }

    #[test]
    fn ghost_mode_remains_clickable_for_exit_actions() {
        let mut widget = default_widget_window_state("todo", Some("todo".to_string()));

        apply_widget_window_mode_update(&mut widget, "GHOST".to_string(), None);

        assert_eq!(widget.mode, "GHOST");
        assert!(!widget.click_through);

        widget.click_through = true;
        apply_open_widget_window_update(&mut widget, "GHOST".to_string(), None);

        assert_eq!(widget.mode, "GHOST");
        assert!(!widget.click_through);
    }

    #[test]
    fn open_widget_window_without_room_id_preserves_existing_room_context() {
        let mut widget = WidgetWindowState {
            selected_room_id: Some("room-1".to_string()),
            ..default_widget_window_state("schedule", Some("schedule".to_string()))
        };

        apply_open_widget_window_update(&mut widget, "DEFAULT".to_string(), None);

        assert_eq!(widget.mode, "DEFAULT");
        assert_eq!(widget.selected_room_id.as_deref(), Some("room-1"));

        apply_open_widget_window_update(
            &mut widget,
            "TRANSLUCENT".to_string(),
            Some("room-2".to_string()),
        );

        assert_eq!(widget.selected_room_id.as_deref(), Some("room-2"));
    }

    #[test]
    fn widget_window_id_targets_requested_bubble_when_active_bubble_differs() {
        let mut store = WidgetWindowStore::default();
        store.active_bubble = "schedule".to_string();
        store.bubbles.insert(
            "todo".to_string(),
            WidgetWindowState {
                selected_room_id: Some("room-todo".to_string()),
                window_visible: true,
                ..default_widget_window_state("todo", Some("todo".to_string()))
            },
        );

        assert_eq!(
            resolve_target_bubble(&store, None, Some("todo".to_string())),
            "todo"
        );

        let state = Mutex::new(store);
        let widget = with_widget_state(&state, None, Some("todo".to_string()), |_| {})
            .expect("read widget by window id");

        assert_eq!(widget.active_bubble, "todo");
        assert_eq!(widget.window_id.as_deref(), Some("todo"));
        assert_eq!(widget.selected_room_id.as_deref(), Some("room-todo"));
    }

    #[test]
    fn seed_widget_bar_items_creates_hidden_minimized_widgets_without_hiding_visible_one() {
        let mut store = WidgetWindowStore::default();
        store.bubbles.insert(
            "todo".to_string(),
            WidgetWindowState {
                window_visible: true,
                ..default_widget_window_state("todo", Some("todo".to_string()))
            },
        );

        let seeded = seed_widget_bar_items_for_store(&mut store, Some("room-1".to_string()));

        assert_eq!(store.bubbles.len(), QA_ALL_WIDGET_BUBBLES.len());
        assert_eq!(
            store
                .bubbles
                .get("todo")
                .and_then(|widget| widget.selected_room_id.as_deref()),
            Some("room-1")
        );
        assert!(store
            .bubbles
            .get("todo")
            .is_some_and(|widget| widget.window_visible));
        assert_eq!(seeded.len(), QA_ALL_WIDGET_BUBBLES.len() - 1);
        assert!(seeded.iter().all(|widget| {
            widget.mode == "MINIMIZED"
                && !widget.window_visible
                && widget.selected_room_id.as_deref() == Some("room-1")
        }));
    }

    #[test]
    fn minimizing_widget_marks_dock_bar_window_visible() {
        let mut store = WidgetWindowStore::default();

        let bar = widget_bar_state_for_show(&mut store);

        assert_eq!(bar.active_bubble, "bar");
        assert_eq!(bar.mode, "DEFAULT");
        assert!(bar.window_visible);
        assert!(!bar.click_through);
        assert!(store
            .bubbles
            .get("bar")
            .is_some_and(|widget| widget.window_visible));
    }

    #[test]
    fn main_window_route_allows_only_known_routes() {
        assert_eq!(
            normalize_widget_menu_route(Some("settings".to_string())),
            Some("/app/settings")
        );
        assert_eq!(
            normalize_widget_menu_route(Some("javascript:alert(1)".to_string())),
            None
        );
        assert_eq!(normalize_widget_menu_route(None), None);
    }

    #[test]
    fn resize_clamps_between_bubble_default_and_max_scale() {
        let base = widget_default_bubble_size("memo");

        let too_small = clamp_widget_user_size("memo", 10.0, 10.0);
        assert_eq!(too_small.width, base.width);
        assert_eq!(too_small.height, base.height);

        let too_big = clamp_widget_user_size("memo", 10_000.0, 10_000.0);
        assert_eq!(
            too_big.width,
            (base.width * WIDGET_USER_SIZE_MAX_SCALE).round()
        );
        assert_eq!(
            too_big.height,
            (base.height * WIDGET_USER_SIZE_MAX_SCALE).round()
        );

        // 범위 안 값은 정수로 반올림만 한다(분수 논리 px 금지).
        let in_range = clamp_widget_user_size("memo", base.width + 20.4, base.height + 30.6);
        assert_eq!(in_range.width, (base.width + 20.0).round());
        assert_eq!(in_range.height, (base.height + 31.0).round());
    }

    #[test]
    fn arrange_places_two_rows_per_column_from_top_right() {
        let targets = vec![
            default_widget_window_state("todo", Some("todo".to_string())),
            default_widget_window_state("agent", Some("agent".to_string())),
            default_widget_window_state("chat", Some("chat".to_string())),
        ];

        let placements = arrange_widget_grid_placements(&targets, 1440.0);

        assert_eq!(placements.len(), 3);
        let todo_size = widget_default_bubble_size("todo");
        let agent_size = widget_default_bubble_size("agent");
        let chat_size = widget_default_bubble_size("chat");

        // 1열(우측): todo 위, agent 아래.
        let column_one_width = todo_size.width.max(agent_size.width);
        let column_one_x = (1440.0 - 24.0 - column_one_width).round() as i32;
        assert_eq!(placements[0].0, "bubli-widget-todo");
        assert_eq!(placements[0].1.x, column_one_x);
        assert_eq!(placements[0].1.y, 24);
        assert_eq!(placements[1].0, "bubli-widget-agent");
        assert_eq!(placements[1].1.x, column_one_x);
        assert_eq!(
            placements[1].1.y,
            (24.0 + todo_size.height + 24.0).round() as i32
        );

        // 2열은 1열 왼쪽으로 24px 간격.
        let column_two_x = (column_one_x as f64 - 24.0 - chat_size.width)
            .max(24.0)
            .round() as i32;
        assert_eq!(placements[2].0, "bubli-widget-chat");
        assert_eq!(placements[2].1.x, column_two_x);
        assert_eq!(placements[2].1.y, 24);
    }

    #[test]
    fn widget_pointer_rects_hit_test_applies_padding() {
        let rects = vec![WidgetInteractiveRect {
            height: 64.0,
            width: 320.0,
            x: 20.0,
            y: 156.0,
        }];

        // rect 내부와 4px 패딩 경계는 클릭 가능, 그 밖(투명 영역)은 통과 대상.
        assert!(widget_pointer_inside_rects(&rects, 24.0, 160.0));
        assert!(widget_pointer_inside_rects(&rects, 16.5, 152.5));
        assert!(widget_pointer_inside_rects(&rects, 343.5, 223.5));
        assert!(!widget_pointer_inside_rects(&rects, 10.0, 10.0));
        assert!(!widget_pointer_inside_rects(&rects, 180.0, 40.0));
        assert!(!widget_pointer_inside_rects(&[], 24.0, 160.0));
    }

    #[test]
    fn widget_pointer_local_position_uses_active_monitor_scale() {
        let cursor = PhysicalPosition::new(1800.0, 540.0);
        let origin = PhysicalPosition::new(1700, 460);

        let (local_x, local_y) = widget_pointer_local_position(&cursor, &origin, 2.0);

        assert_eq!(local_x, 50.0);
        assert_eq!(local_y, 40.0);
    }

    #[test]
    fn widget_pointer_plausibility_rejects_coordinate_drift() {
        assert!(widget_pointer_position_is_plausible(
            12.0, 18.0, 320.0, 360.0
        ));
        assert!(widget_pointer_position_is_plausible(
            -16.0, 18.0, 320.0, 360.0
        ));
        assert!(!widget_pointer_position_is_plausible(
            -2400.0, 18.0, 320.0, 360.0
        ));
        assert!(!widget_pointer_position_is_plausible(
            12.0, 1800.0, 320.0, 360.0
        ));
    }

    #[test]
    fn seed_widget_bar_items_clears_stale_room_context() {
        let mut store = WidgetWindowStore::default();
        store.bubbles.insert(
            "todo".to_string(),
            WidgetWindowState {
                selected_room_id: Some("stale-room".to_string()),
                ..default_widget_window_state("todo", Some("todo".to_string()))
            },
        );

        let seeded = seed_widget_bar_items_for_store(&mut store, None);

        assert!(store
            .bubbles
            .values()
            .all(|widget| widget.selected_room_id.is_none()));
        assert!(seeded
            .iter()
            .all(|widget| widget.selected_room_id.is_none()));
    }

    #[test]
    fn seed_widget_bar_items_recovers_visible_state_when_window_is_missing() {
        let mut store = WidgetWindowStore::default();
        store.bubbles.insert(
            "schedule".to_string(),
            WidgetWindowState {
                mode: "DEFAULT".to_string(),
                window_visible: true,
                ..default_widget_window_state("schedule", Some("schedule".to_string()))
            },
        );

        recover_stale_visible_widgets_for_bar(&mut store, &HashSet::new());
        let seeded = seed_widget_bar_items_for_store(&mut store, Some("room-1".to_string()));
        let schedule = store.bubbles.get("schedule").expect("schedule widget");

        assert_eq!(schedule.mode, "MINIMIZED");
        assert!(!schedule.window_visible);
        assert_eq!(schedule.selected_room_id.as_deref(), Some("room-1"));
        assert!(seeded.iter().any(|widget| {
            widget.active_bubble == "schedule"
                && widget.mode == "MINIMIZED"
                && !widget.window_visible
        }));
    }
}
