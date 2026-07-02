import { readFileSync } from "node:fs";
import { join } from "node:path";

// i18n 메시지 사전 정합성 검사.
// TypeScript(Record<MessageKey, string>)가 컴파일 단계에서 en/ja 키 누락을 잡지만,
// 이 스크립트는 tsc 없이 CI에서 빠르게 아래를 추가로 검증한다.
// - ko / en / ja 세 사전의 키 집합이 완전히 동일한지 (누락/잉여)
// - 빈 문자열 값이 없는지
// - 사전 안 중복 키가 없는지

const ROOT = process.cwd();
const MESSAGES_PATH = join(ROOT, "src", "lib", "i18n", "messages.ts");

const DICT_STARTS = [
  { name: "ko", re: /const ko = \{/, end: /^\} as const;/ },
  { name: "en", re: /const en: Record<MessageKey, string> = \{/, end: /^\};/ },
  { name: "ja", re: /const ja: Record<MessageKey, string> = \{/, end: /^\};/ },
];

// 키 라인: 들여쓰기 + "키": 값...  (값은 같은 줄에 있을 수도, 다음 줄로 이어질 수도 있음)
const KEY_LINE = /^\s*"([^"]+)"\s*:\s*(.*)$/;

function parseDictionaries(text) {
  const lines = text.split(/\r?\n/);
  const dicts = {};
  const duplicates = [];
  const empties = [];

  let current = null;
  let endRe = null;

  for (const line of lines) {
    if (!current) {
      const start = DICT_STARTS.find((d) => d.re.test(line));
      if (start) {
        current = start.name;
        endRe = start.end;
        dicts[current] = new Map();
      }
      continue;
    }

    if (endRe.test(line)) {
      current = null;
      endRe = null;
      continue;
    }

    const match = KEY_LINE.exec(line);
    if (!match) {
      continue;
    }

    const key = match[1];
    const rawValue = match[2].trim();

    if (dicts[current].has(key)) {
      duplicates.push(`${current}: duplicate key "${key}"`);
    }
    dicts[current].set(key, rawValue);

    // 같은 줄에 값이 있고 그 값이 빈 문자열이면 오류. (다음 줄로 이어지는 값은 rawValue가 비어 있으니 건너뜀)
    if (/^""[,]?$/.test(rawValue)) {
      empties.push(`${current}: empty value for "${key}"`);
    }
  }

  return { dicts, duplicates, empties };
}

const text = readFileSync(MESSAGES_PATH, "utf8");
const { dicts, duplicates, empties } = parseDictionaries(text);

const failures = [...duplicates, ...empties];

const names = DICT_STARTS.map((d) => d.name);
for (const name of names) {
  if (!dicts[name]) {
    failures.push(`Could not locate the "${name}" dictionary in ${MESSAGES_PATH}.`);
  }
}

if (dicts.ko && dicts.en && dicts.ja) {
  const koKeys = new Set(dicts.ko.keys());

  for (const name of ["en", "ja"]) {
    const localeKeys = new Set(dicts[name].keys());
    for (const key of koKeys) {
      if (!localeKeys.has(key)) {
        failures.push(`${name}: missing key "${key}" (present in ko)`);
      }
    }
    for (const key of localeKeys) {
      if (!koKeys.has(key)) {
        failures.push(`${name}: extra key "${key}" (not in ko)`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("i18n message check failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const total = dicts.ko ? dicts.ko.size : 0;
console.log(`i18n message check passed. ${total} keys x ${names.length} locales (${names.join(", ")}).`);
