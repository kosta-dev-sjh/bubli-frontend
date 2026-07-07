// Dynamic messages used by local adapters outside React hooks.
const ko = {
  "local.activity.consentRequired": "활동 감지는 사용자가 동의한 뒤에만 읽을 수 있습니다.",
  "local.activity.noNewDwell": "활동 감지는 켜져 있지만 이번 주기에 새로 기록할 체류 시간이 없습니다.",
  "local.activity.recorded": "현재 활동을 서버에 기록했습니다.",
  "local.activity.noResend": "서버에 다시 보낼 활동 기록이 없습니다.",
  "local.activity.resent": "활동 기록 {count}건을 서버에 다시 반영했습니다.",
  "local.adapter.requiresTauri": "데스크톱 앱이 아닐 때는 로컬 저장소와 개인 폴더 기능을 사용할 수 없습니다.",
  "local.adapter.unknownError": "알 수 없는 데스크톱 앱 오류가 발생했습니다.",
  "local.cache.ready": "이 기기에서 로컬 저장소를 쓸 수 있습니다.",
  "local.folder.consentRequired": "개인 관리 폴더는 사용자가 동의한 뒤에만 감시하거나 서버에 반영할 수 있습니다.",
  "local.folder.personalOnly": "개인 로컬 폴더는 개인 자료 전용입니다. 프로젝트룸 공용 자료는 서버 업로드 흐름으로 연결해야 합니다.",
  "local.folder.watchPending": "실시간 폴더 감시를 시작했습니다. 변경분은 로컬 SQLite에 먼저 기록된 뒤 서버에 반영됩니다.",
  "local.folder.noChanges": "서버에 보낼 로컬 파일 변경분이 없습니다.",
  "local.folder.synced": "로컬 파일 변경 {count}건을 서버에 반영했습니다.",
  "local.sync.outboxChecked": "동기화 outbox 상태를 확인했습니다. 서버 전송은 승인된 전송 흐름에서 처리됩니다.",
  "local.sync.widgetQueued": "버블 사용 요약을 서버 전송 대기열에 올렸습니다. 인증된 동기화 흐름에서 반영됩니다.",
  "local.sync.noDirectSend": "로컬 어댑터는 서버 전송을 직접 수행하지 않습니다. 인증된 API 클라이언트가 별도 승인 흐름에서 처리해야 합니다.",
  "local.widget.readerPending": "로컬 버블 표시 캐시 reader가 연결되면 SQLite summary를 먼저 읽고 서버 API를 fallback으로 씁니다.",
  "local.widget.readFailed": "버블 summary를 읽지 못했습니다.",
} as const;

type Key = keyof typeof ko;

const en: Record<Key, string> = {
  "local.activity.consentRequired": "Activity detection can only be read after the user consents.",
  "local.activity.noNewDwell": "Activity detection is on, but there is no new dwell time to record this cycle.",
  "local.activity.recorded": "Recorded the current activity to the server.",
  "local.activity.noResend": "There are no activity records to resend to the server.",
  "local.activity.resent": "Re-synced {count} activity records to the server.",
  "local.adapter.requiresTauri": "Local storage and personal folder features are unavailable outside the desktop app.",
  "local.adapter.unknownError": "An unknown desktop app error occurred.",
  "local.cache.ready": "Local storage is available on this device.",
  "local.folder.consentRequired": "Personal managed folders can only be watched or reflected to the server after the user consents.",
  "local.folder.personalOnly": "Personal local folders are for personal resources only. Project-room shared resources must go through the server upload flow.",
  "local.folder.watchPending": "Real-time folder watching has started. Changes are recorded in local SQLite first, then reflected to the server.",
  "local.folder.noChanges": "There are no local file changes to send to the server.",
  "local.folder.synced": "Synced {count} local file changes to the server.",
  "local.sync.outboxChecked": "Checked the sync outbox state. Server transfer is handled by the approved send flow.",
  "local.sync.widgetQueued": "Queued the bubble usage summary for server send. It will be reflected by the authenticated sync flow.",
  "local.sync.noDirectSend": "The local adapter doesn't send to the server directly. An authenticated API client must handle it in a separate approval flow.",
  "local.widget.readerPending": "Once the local bubble display cache reader is connected, it reads the SQLite summary first and falls back to the server API.",
  "local.widget.readFailed": "Couldn't read the bubble summary.",
};

const ja: Record<Key, string> = {
  "local.activity.consentRequired": "アクティビティ検知は、ユーザーが同意した後にのみ読み取れます。",
  "local.activity.noNewDwell": "アクティビティ検知は有効ですが、この周期で新しく記録する滞在時間はありません。",
  "local.activity.recorded": "現在のアクティビティをサーバーに記録しました。",
  "local.activity.noResend": "サーバーに再送するアクティビティ記録はありません。",
  "local.activity.resent": "アクティビティ記録{count}件をサーバーに再反映しました。",
  "local.adapter.requiresTauri": "デスクトップアプリでない場合、ローカル保存と個人フォルダ機能は使用できません。",
  "local.adapter.unknownError": "不明なデスクトップアプリのエラーが発生しました。",
  "local.cache.ready": "この端末ではローカル保存を使用できます。",
  "local.folder.consentRequired": "個人管理フォルダは、ユーザーが同意した後にのみ監視またはサーバー反映できます。",
  "local.folder.personalOnly": "個人ローカルフォルダは個人資料専用です。プロジェクトルームの共用資料はサーバーアップロードのフローで連携する必要があります。",
  "local.folder.watchPending": "リアルタイムフォルダ監視を開始しました。変更はまずローカルSQLiteに記録され、その後サーバーに反映されます。",
  "local.folder.noChanges": "サーバーに送信するローカルファイル変更はありません。",
  "local.folder.synced": "ローカルファイル変更{count}件をサーバーに反映しました。",
  "local.sync.outboxChecked": "同期outboxの状態を確認しました。サーバー送信は承認済みの送信フローで処理されます。",
  "local.sync.widgetQueued": "バブル使用要約をサーバー送信キューに追加しました。認証済み同期フローで反映されます。",
  "local.sync.noDirectSend": "ローカルアダプターはサーバー送信を直接実行しません。認証済みAPIクライアントが別の承認フローで処理する必要があります。",
  "local.widget.readerPending": "ローカルバブル表示キャッシュreaderが接続されると、SQLite summaryを先に読み、サーバーAPIをfallbackとして使います。",
  "local.widget.readFailed": "バブルsummaryを読み取れませんでした。",
};

export const localMessages = { ko, en, ja };
