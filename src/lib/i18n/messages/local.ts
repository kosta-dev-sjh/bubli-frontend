// 로컬 어댑터/동기화 계층(비컴포넌트 모듈)에서 translate()로 쓰는 동적 메시지 네임스페이스.
const ko = {
  "local.activity.consentRequired": "활동 감지는 사용자가 동의한 뒤에만 읽을 수 있습니다.",
  "local.activity.noNewDwell": "활동 감지는 켜져 있지만 이번 주기에 새로 기록할 체류 시간이 없습니다.",
  "local.activity.recorded": "현재 활동을 서버에 기록했습니다.",
  "local.activity.noResend": "서버에 다시 보낼 활동 기록이 없습니다.",
  "local.activity.resent": "활동 기록 {count}건을 서버에 다시 반영했습니다.",
  "local.adapter.requiresTauri": "Tauri 앱이 아닐 때는 로컬 SQLite와 개인 폴더 기능을 사용할 수 없습니다.",
  "local.adapter.unknownError": "알 수 없는 Tauri 명령 오류가 발생했습니다.",
  "local.cache.ready": "Tauri 로컬 SQLite 저장소를 쓸 수 있는 환경입니다.",
  "local.folder.personalOnly": "개인 로컬 폴더는 개인 자료 전용입니다. 프로젝트룸 공용 자료는 서버 업로드 흐름으로 연결해야 합니다.",
  "local.folder.watchPending": "실시간 폴더 감시는 아직 준비 중입니다. 지금은 수동 스캔 결과를 사용합니다.",
  "local.folder.noChanges": "서버에 보낼 로컬 파일 변경분이 없습니다.",
  "local.folder.synced": "로컬 파일 변경 {count}건을 서버에 반영했습니다.",
  "local.sync.outboxChecked": "동기화 outbox 상태만 확인했습니다. 실제 서버 전송은 아직 실행하지 않습니다.",
  "local.sync.widgetQueued": "위젯 사용 요약을 서버 전송 대기열에 올렸습니다. 서버 전송 완료로 표시하지 않습니다.",
  "local.sync.noDirectSend": "로컬 어댑터는 서버 전송을 직접 하지 않습니다. 인증된 API 클라이언트가 별도 승인 흐름에서 처리해야 합니다.",
  "local.widget.readerPending": "로컬 위젯 표시 캐시 reader가 연결되면 SQLite summary를 먼저 읽고 서버 API를 fallback으로 씁니다.",
  "local.widget.readFailed": "위젯 summary를 읽지 못했습니다.",
} as const;

type Key = keyof typeof ko;

const en: Record<Key, string> = {
  "local.activity.consentRequired": "Activity detection can only be read after the user consents.",
  "local.activity.noNewDwell": "Activity detection is on, but there is no new dwell time to record this cycle.",
  "local.activity.recorded": "Recorded the current activity to the server.",
  "local.activity.noResend": "There are no activity records to resend to the server.",
  "local.activity.resent": "Re-synced {count} activity records to the server.",
  "local.adapter.requiresTauri": "Local SQLite and personal folder features are unavailable outside the Tauri app.",
  "local.adapter.unknownError": "An unknown Tauri command error occurred.",
  "local.cache.ready": "This environment can use the Tauri local SQLite store.",
  "local.folder.personalOnly": "Personal local folders are for personal resources only. Project-room shared resources must go through the server upload flow.",
  "local.folder.watchPending": "Real-time folder watching isn't ready yet. Using manual scan results for now.",
  "local.folder.noChanges": "There are no local file changes to send to the server.",
  "local.folder.synced": "Synced {count} local file changes to the server.",
  "local.sync.outboxChecked": "Only checked the sync outbox status. The actual server send hasn't run yet.",
  "local.sync.widgetQueued": "Queued the widget usage summary for server send. Not marked as sent.",
  "local.sync.noDirectSend": "The local adapter doesn't send to the server directly. An authenticated API client must handle it in a separate approval flow.",
  "local.widget.readerPending": "Once the local widget display cache reader is connected, it reads the SQLite summary first and falls back to the server API.",
  "local.widget.readFailed": "Couldn't read the widget summary.",
};

const ja: Record<Key, string> = {
  "local.activity.consentRequired": "アクティビティ検知はユーザーが同意した後にのみ読み取れます。",
  "local.activity.noNewDwell": "アクティビティ検知はオンですが、今回の周期で新たに記録する滞在時間はありません。",
  "local.activity.recorded": "現在のアクティビティをサーバーに記録しました。",
  "local.activity.noResend": "サーバーに再送するアクティビティ記録はありません。",
  "local.activity.resent": "アクティビティ記録{count}件をサーバーに再反映しました。",
  "local.adapter.requiresTauri": "Tauriアプリでない場合、ローカルSQLiteと個人フォルダ機能は使用できません。",
  "local.adapter.unknownError": "不明なTauriコマンドエラーが発生しました。",
  "local.cache.ready": "TauriのローカルSQLiteストレージを使える環境です。",
  "local.folder.personalOnly": "個人ローカルフォルダは個人資料専用です。プロジェクトルームの共用資料はサーバーアップロードのフローで連携する必要があります。",
  "local.folder.watchPending": "リアルタイムのフォルダ監視はまだ準備中です。今は手動スキャンの結果を使用します。",
  "local.folder.noChanges": "サーバーに送るローカルファイルの変更分はありません。",
  "local.folder.synced": "ローカルファイルの変更{count}件をサーバーに反映しました。",
  "local.sync.outboxChecked": "同期outboxの状態のみ確認しました。実際のサーバー送信はまだ実行していません。",
  "local.sync.widgetQueued": "ウィジェット利用サマリーをサーバー送信キューに載せました。送信完了とは表示しません。",
  "local.sync.noDirectSend": "ローカルアダプターはサーバー送信を直接行いません。認証されたAPIクライアントが別の承認フローで処理する必要があります。",
  "local.widget.readerPending": "ローカルウィジェット表示キャッシュのreaderが接続されると、SQLite summaryを先に読み、サーバーAPIをfallbackとして使います。",
  "local.widget.readFailed": "ウィジェットのsummaryを読み取れませんでした。",
};

export const localMessages = { ko, en, ja };
