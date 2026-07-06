import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_ROOTS = ["src", ".storybook"];
const SOURCE_EXTENSIONS = new Set([".css", ".js", ".jsx", ".ts", ".tsx"]);
const HEX_SOURCE_FILES = new Set(["src/styles/globals.css", ".storybook/preview.ts"]);

// hex 직접 표기를 허용하되 반드시 allowlist(아래) 색만 쓰도록 검증하는 파일들.
// - *.stories.tsx: Storybook 미리보기 픽스처(배포 UI 아님)
// - *.module.css: 컴포넌트 스코프 스타일시트(globals.css와 같은 성격)
// - ui/ring.tsx: SVG gradient stop·segment stroke는 presentation attribute라 var()가 풀리지 않으므로 색을 직접 둔다
const RING_SVG_FILE = "src/components/ui/ring.tsx";
function isHexAllowedFile(relativePath) {
  return (
    HEX_SOURCE_FILES.has(relativePath) ||
    relativePath.endsWith(".stories.tsx") ||
    relativePath.endsWith(".module.css") ||
    relativePath === RING_SVG_FILE
  );
}

const ALLOWED_HEX_COLORS = new Set(
  [
    // 타이머(코랄)/메모(골드)/자료(브라운) 재보정 + 메뉴 잉크
    "#FF6B3D",
    "#AE3009",
    "#982400",
    "#FFC20D",
    "#715500",
    "#523E00",
    "#C37124",
    "#603507",
    "#482500",
    // 메모/자료 진하게 보정 + 메뉴 잉크
    "#FFC10A",
    "#997200",
    "#7A5B00",
    "#C16E1F",
    "#77410D",
    "#653200",
    // 버블 8색 구분 팔레트 + 메뉴 잉크
    "#004D87",
    "#005EA6",
    "#006267",
    "#00893D",
    "#067A80",
    "#12BEC8",
    "#1E8A4E",
    "#2F9BFF",
    "#3A00DE",
    "#58CE86",
    "#5B34C9",
    "#713B00",
    "#7A4A16",
    "#7B5D00",
    "#994D00",
    "#9A7400",
    "#9B7BF0",
    "#B85C00",
    "#C1003D",
    "#C21E52",
    "#C6864A",
    "#F55E8B",
    "#F7C83E",
    "#FF9B3D",
    // 메뉴 아이콘 잉크 채도100/명도-6 (가시성)
    "#005893",
    "#934C00",
    "#F20046",
    "#2F00E3",
    "#00A258",
    // 위젯 버블 포인트 컬러 채도+22/명도-6 (버블 한정)
    "#1B6597",
    "#1B84DF",
    "#43ACFF",
    "#4733C9",
    "#4B25DD",
    "#53BAFF",
    "#69DA91",
    "#9081E8",
    "#985B1A",
    "#D1BCFB",
    "#D63B68",
    "#F1B773",
    "#F27195",
    "#F2B577",
    "#F46E6E",
    "#F9CA92",
    "#F7F9FA",
    "#2C3540",
    "#5A6772",
    "#8A94A0",
    "#B6E0F6",
    "#6B8FA8",
    "#66C3FF",
    "#F2B577",
    "#F46E6E",
    "#D1BCFB",
    "#CDD8DF",
    "#E5E7EB",
    "#43ACFF",
    "#84D1FF",
    "#1B6597",
    "#D9E2F3",
    "#80E0AD",
    "#76DC9D",
    "#F9CA92",
    "#1B84DF",
    "#4B25DD",
    "#985B1A",
    "#FBFCFE",
    "#FFFFFF",
    "#FFF",
    // Sky Opal 팔레트(globals.css :root 토큰 정의값) + Night Bubble 다크 잉크/표면.
    // 색 자체는 바꾸지 않는다. 토큰 정의·SVG·스토리·CSS 모듈에서 쓰이는 승인 색을 등록만 한다.
    "#FCFDFF",
    "#F8F6F4",
    "#F2F7FC",
    "#B9E4FF",
    "#7FCCFF",
    "#1B68B8",
    "#BEB6FC",
    "#4733C9",
    "#F8BDDE",
    "#23303B",
    "#586978",
    "#98A5AF",
    "#53BAFF",
    "#9081E8",
    "#F1B773",
    "#F27195",
    "#69DA91",
    "#F2BBD2",
    "#CBD8DC",
    // Night Bubble 다크 텍스트/표면/배경 리터럴
    "#C2CFE6",
    "#EAF0F8",
    "#BFD6F5",
    "#A7B6CC",
    "#D63B68",
    "#CDD9F0",
    "#161E2E",
    "#121A28",
    "#131A28",
    "#0E1626",
    "#3B4A66",
    "#10151F",
    "#EAF2FB",
    "#E0EAF6",
    "#EEF5FB",
    "#F6F3FB",
    "#F4F9FF",
    // color-mix로 accent를 어둡게 섞을 때 쓰는 순수 검정(위젯 버블 라벨 대비).
    "#000",
  ].map((color) => color.toUpperCase()),
);

// PR 번호(예: #429)나 설명이 주석에 들어가면 3자리 hex 색으로 오탐된다.
// 색 검사 전에 주석을 지운다 — 블록 주석은 모든 파일, 라인 주석은 JS/TS만(CSS url(//)의 //는 보존).
function stripCommentsForColorScan(text, relativePath) {
  let stripped = text.replace(/\/\*[\s\S]*?\*\//g, " ");
  if (!relativePath.endsWith(".css")) {
    stripped = stripped.replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  }
  return stripped;
}

const failures = [];

for (const root of SCAN_ROOTS) {
  yieldFiles(join(ROOT, root), (filePath) => {
    const relativePath = relative(ROOT, filePath).replaceAll("\\", "/");
    const text = stripCommentsForColorScan(readFileSync(filePath, "utf8"), relativePath);
    const matches = text.matchAll(/#[0-9a-fA-F]{3,8}\b/g);

    for (const match of matches) {
      const color = match[0].toUpperCase();
      if (!isHexAllowedFile(relativePath)) {
        failures.push(`${relativePath}: ${match[0]} should use a CSS token instead of a direct hex color.`);
        continue;
      }

      if (!ALLOWED_HEX_COLORS.has(color)) {
        failures.push(`${relativePath}: ${match[0]} is not in the Bubli design token allowlist.`);
      }
    }
  });
}

if (failures.length > 0) {
  console.error("Design token check failed.");
  console.error("Use the Bubli design tokens in src/styles/globals.css or update this allowlist deliberately.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Design token check passed.");

function yieldFiles(directory, onFile) {
  if (!existsSync(directory)) {
    return;
  }

  for (const entry of readdirSync(directory)) {
    const absolutePath = join(directory, entry);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      yieldFiles(absolutePath, onFile);
      continue;
    }

    if (!stat.isFile()) {
      continue;
    }

    if (SOURCE_EXTENSIONS.has(getExtension(entry))) {
      onFile(absolutePath);
    }
  }
}

function getExtension(fileName) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) {
    return "";
  }
  return fileName.slice(dotIndex);
}
