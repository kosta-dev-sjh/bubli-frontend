// 공통 문구 네임스페이스.
// ko를 source of truth로 두고, en/ja는 같은 키를 모두 채운다(Record<Key, string>가 컴파일 단계에서 누락을 잡는다).
const ko = {
  "common.save": "저장",
  "common.cancel": "취소",
  "common.close": "닫기",
  "common.confirm": "확인",
  "common.delete": "삭제",
  "common.edit": "수정",
  "common.loading": "불러오는 중",
  "common.login": "로그인",
  "common.logout": "로그아웃",
  "common.search": "검색",
  "common.retry": "다시 시도",
  "common.open": "열기",
  "common.back": "뒤로",
} as const;

type Key = keyof typeof ko;

const en: Record<Key, string> = {
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.confirm": "Confirm",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.loading": "Loading",
  "common.login": "Log in",
  "common.logout": "Log out",
  "common.search": "Search",
  "common.retry": "Retry",
  "common.open": "Open",
  "common.back": "Back",
};

const ja: Record<Key, string> = {
  "common.save": "保存",
  "common.cancel": "キャンセル",
  "common.close": "閉じる",
  "common.confirm": "確認",
  "common.delete": "削除",
  "common.edit": "編集",
  "common.loading": "読み込み中",
  "common.login": "ログイン",
  "common.logout": "ログアウト",
  "common.search": "検索",
  "common.retry": "再試行",
  "common.open": "開く",
  "common.back": "戻る",
};

export const commonMessages = { ko, en, ja };
