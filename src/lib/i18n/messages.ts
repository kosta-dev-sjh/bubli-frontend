import type { Locale } from "./locale";

// 번역 사전. ko를 기준(source of truth)으로 두고, en/ja는 같은 키를 모두 채운다.
// 키가 늘어나면 en/ja에서 누락 시 타입 에러가 나므로 번역 누락을 컴파일 단계에서 잡는다.
// 없는 번역은 t()에서 ko fallback → key 순으로 대체한다.
const ko = {
  // 공통
  "common.save": "저장",
  "common.cancel": "취소",
  "common.loading": "불러오는 중",

  // 설정 (Stage 1 기반 시드 · Stage 2에서 확장)
  "settings.title": "설정",
  "settings.display": "표시",
  "settings.languageScreen": "언어와 화면",
  "settings.language": "언어",
  "settings.save": "저장",
} as const;

export type MessageKey = keyof typeof ko;

const en: Record<MessageKey, string> = {
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.loading": "Loading",

  "settings.title": "Settings",
  "settings.display": "Display",
  "settings.languageScreen": "Language & Display",
  "settings.language": "Language",
  "settings.save": "Save",
};

const ja: Record<MessageKey, string> = {
  "common.save": "保存",
  "common.cancel": "キャンセル",
  "common.loading": "読み込み中",

  "settings.title": "設定",
  "settings.display": "表示",
  "settings.languageScreen": "言語と画面",
  "settings.language": "言語",
  "settings.save": "保存",
};

export const messages: Record<Locale, Record<MessageKey, string>> = { ko, en, ja };
