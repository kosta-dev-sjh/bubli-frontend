import { DEFAULT_LOCALE, readStoredLocale } from "./locale";
import { messages, type MessageKey } from "./messages";

type TranslateVars = Record<string, string | number>;

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

// 훅(useI18n)을 쓸 수 없는 모듈(로컬 어댑터·데이터 레이어)에서 현재 로케일로 번역한다.
// 저장된 로케일(bubli-locale)을 읽어 호출 시점의 언어로 문자열을 만든다(반응형 리렌더는 없음).
// 서버/비브라우저 환경에서는 readStoredLocale()가 기본 로케일을 반환한다.
export function translate(key: MessageKey, vars?: TranslateVars): string {
  const locale = readStoredLocale();
  const template = messages[locale]?.[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
  return interpolate(template, vars);
}
