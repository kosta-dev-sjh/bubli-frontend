import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// i18n 메시지 사전 정합성 검사(네임스페이스 모듈 구조).
// TypeScript(Record<Key, string>)가 컴파일 단계에서 en/ja 키 누락을 잡지만,
// 이 스크립트는 tsc 없이 CI에서 빠르게 아래를 추가로 검증한다.
// - 각 네임스페이스 파일에서 ko / en / ja 세 사전의 키 집합이 완전히 동일한지 (누락/잉여)
// - 빈 문자열 값이 없는지
// - 사전 안 중복 키가 없는지
// - 네임스페이스 사이 키 충돌(합칠 때 조용히 덮어써지는 문제)이 없는지

const ROOT = process.cwd();
const MESSAGES_DIR = join(ROOT, "src", "lib", "i18n", "messages");

const DICT_STARTS = [
  { name: "ko", re: /^const ko = \{/, end: /^\} as const;/ },
  { name: "en", re: /^const en: Record<\w+, string> = \{/, end: /^\};/ },
  { name: "ja", re: /^const ja: Record<\w+, string> = \{/, end: /^\};/ },
];

// 키 라인: 들여쓰기 + "키": 값...  (값은 같은 줄에 있을 수도, 다음 줄로 이어질 수도 있음)
const KEY_LINE = /^\s*"([^"]+)"\s*:\s*(.*)$/;

function parseDictionaries(text, fileLabel) {
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
      duplicates.push(`${fileLabel} ${current}: duplicate key "${key}"`);
    }
    dicts[current].set(key, rawValue);

    // 같은 줄에 값이 있고 그 값이 빈 문자열이면 오류. (다음 줄로 이어지는 값은 rawValue가 비어 있으니 건너뜀)
    if (/^""[,]?$/.test(rawValue)) {
      empties.push(`${fileLabel} ${current}: empty value for "${key}"`);
    }
  }

  return { dicts, duplicates, empties };
}

const files = readdirSync(MESSAGES_DIR)
  .filter((name) => name.endsWith(".ts"))
  .sort();

const failures = [];
const seenKeys = new Map(); // key -> namespace file (네임스페이스 간 충돌 검사)
let totalKeys = 0;

for (const file of files) {
  const fileLabel = `messages/${file}`;
  const text = readFileSync(join(MESSAGES_DIR, file), "utf8");
  const { dicts, duplicates, empties } = parseDictionaries(text, fileLabel);

  failures.push(...duplicates, ...empties);

  for (const name of DICT_STARTS.map((d) => d.name)) {
    if (!dicts[name]) {
      failures.push(`${fileLabel}: could not locate the "${name}" dictionary.`);
    }
  }

  if (dicts.ko && dicts.en && dicts.ja) {
    const koKeys = new Set(dicts.ko.keys());

    for (const name of ["en", "ja"]) {
      const localeKeys = new Set(dicts[name].keys());
      for (const key of koKeys) {
        if (!localeKeys.has(key)) {
          failures.push(`${fileLabel} ${name}: missing key "${key}" (present in ko)`);
        }
      }
      for (const key of localeKeys) {
        if (!koKeys.has(key)) {
          failures.push(`${fileLabel} ${name}: extra key "${key}" (not in ko)`);
        }
      }
    }

    for (const key of koKeys) {
      if (seenKeys.has(key)) {
        failures.push(`namespace collision: key "${key}" defined in both ${seenKeys.get(key)} and ${fileLabel}`);
      } else {
        seenKeys.set(key, fileLabel);
      }
    }
    totalKeys += koKeys.size;
  }
}

if (failures.length > 0) {
  console.error("i18n message check failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `i18n message check passed. ${totalKeys} keys across ${files.length} namespace files x 3 locales (ko, en, ja).`,
);
