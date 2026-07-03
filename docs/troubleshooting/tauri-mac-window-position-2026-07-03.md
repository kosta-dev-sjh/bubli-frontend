# Tauri Mac 실행 창 위치 트러블슈팅 (2026-07-03)

## 상황

`npm run tauri:dev:backend` 실행 후 Windows에서는 앱이 열리지만, Mac에서는 앱이 안 뜨는 것처럼 보인다는 제보가 있었다.

## 확인한 것

- `BUBLI_TAURI_DEV_URL=http://localhost:3791 npm run tauri:dev:backend` 실행 시 backend smoke는 통과했다.
- `target/debug/bubli` 프로세스는 실행됐다.
- macOS 접근성 API 기준으로 `bubli` 프로세스의 창은 존재했다.
- 창 목록에는 메인 창과 위젯 창이 함께 잡혔다.

확인된 창 예:

```text
Bubli widget      360x428
Bubli widget bar  360x168
Bubli             1280x820
```

## 원인

원인은 두 가지가 겹쳐 보였다.

1. 메인 창과 위젯 창이 같은 프로세스 안에 함께 뜨기 때문에, macOS에서 첫 번째 창만 확인하면 작은 위젯 창만 열린 것처럼 보인다.
2. `position_main_window_on_preferred_monitor`에서 모니터 위치와 창 크기를 물리 픽셀 기준으로 계산한 뒤, Mac에서도 `LogicalPosition`으로 넘기고 있었다. Retina 또는 외부 모니터 조합에서는 좌표가 예상보다 밀려 메인 창이 다른 화면이나 눈에 덜 띄는 위치에 열릴 수 있다.

## 수정

Mac에서는 계산된 물리 픽셀 좌표를 `PhysicalPosition`으로 전달하도록 바꿨다.

또한 앱 준비 시 메인 창에 대해 `unminimize`, `show`, `set_focus`를 호출해 창이 뒤에 숨어 보이는 상황을 줄였다.

Windows는 기존 동작을 유지한다. Windows에서는 기존처럼 `LogicalPosition`을 사용한다.

## 검증

실행 명령:

```bash
BUBLI_TAURI_DEV_URL=http://localhost:3791 npm run tauri:dev:backend
```

결과:

- backend smoke 통과
- `cargo check` 통과
- `target/debug/bubli` 실행 확인
- Mac 창 목록에서 메인 창 `Bubli`가 `1280x820`으로 표시됨

최종 확인된 메인 창:

```text
Bubli | pos=215,144 | size=1280,820
```

## 다음에 같은 문제가 나면 볼 것

1. `ps ax | rg 'target/debug/bubli|dev-widget-real-backend'`로 프로세스가 떠 있는지 확인한다.
2. macOS에서는 `System Events`로 `bubli` 창 목록을 확인한다.
3. 작은 위젯 창만 보이면 메인 창 `Bubli`가 다른 화면에 있는지 확인한다.
4. 외부 모니터를 뺐다 꽂은 뒤 재실행해도 메인 창이 안 보이면 `~/Library/Application Support/kr.bubli.desktop/monitor-preference.json` 값을 확인한다.
