import type { MessageKey } from "@/lib/i18n";

// AI가 분석/생성한 문서의 documentType은 백엔드 enum 이름(CONTRACT, MEETING_NOTE 등)이 그대로 온다.
// 화면에는 이 코드 대신 사람이 읽는 라벨을 보여준다. 알 수 없는 값이면 null을 돌려주고,
// 호출부가 원문(자유 형식 문자열) 또는 기본 라벨로 폴백하게 한다.
const DOCUMENT_TYPE_LABEL_KEYS: Record<string, MessageKey> = {
  CONTRACT: "resources.common.docTypeContract",
  QUOTATION: "resources.common.docTypeQuotation",
  REQUIREMENT: "resources.common.docTypeRequirement",
  REQUIREMENTS: "resources.common.docTypeRequirement",
  MEETING_NOTE: "resources.common.docTypeMeetingNote",
  MEETING_NOTES: "resources.common.docTypeMeetingNote",
  REFERENCE: "resources.common.docTypeReference",
  GENERAL: "resources.common.docTypeGeneral",
};

export function documentTypeLabelKey(type: string | null | undefined): MessageKey | null {
  if (!type) return null;
  return DOCUMENT_TYPE_LABEL_KEYS[type.trim().toUpperCase()] ?? null;
}
