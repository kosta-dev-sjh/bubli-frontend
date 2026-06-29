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
    "#F7F9FA",
    "#2C3540",
    "#5A6772",
    "#8A94A0",
    "#D7EAF4",
    "#6B8FA8",
    "#8ECDF6",
    "#E8C4A0",
    "#E89898",
    "#E6DDF8",
    "#CDD8DF",
    "#E5E7EB",
    "#6FB8F2",
    "#A8DBFA",
    "#36729A",
    "#D9E2F3",
    "#A7D8BE",
    "#9ED3B2",
    "#F1D7B8",
    "#4C91CD",
    "#6F58C9",
    "#9B6A35",
    "#FBFCFE",
    "#FFFFFF",
    "#FFF",
    // Sky Opal 팔레트(globals.css :root 토큰 정의값) + Night Bubble 다크 잉크/표면.
    // 색 자체는 바꾸지 않는다. 토큰 정의·SVG·스토리·CSS 모듈에서 쓰이는 승인 색을 등록만 한다.
    "#FCFDFF",
    "#F8F6F4",
    "#F2F7FC",
    "#D8F0FF",
    "#9ED8FF",
    "#3A78B8",
    "#DCD8F8",
    "#6E63B8",
    "#F6DDEB",
    "#23303B",
    "#586978",
    "#98A5AF",
    "#7CC4F5",
    "#B0A8E0",
    "#E6C49C",
    "#E79BB0",
    "#93CFA8",
    "#F2BBD2",
    "#CBD8DC",
    // Night Bubble 다크 텍스트/표면/배경 리터럴
    "#C2CFE6",
    "#EAF0F8",
    "#BFD6F5",
    "#A7B6CC",
    "#C56B85",
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
  ].map((color) => color.toUpperCase()),
);

const failures = [];

for (const root of SCAN_ROOTS) {
  yieldFiles(join(ROOT, root), (filePath) => {
    const text = readFileSync(filePath, "utf8");
    const relativePath = relative(ROOT, filePath);
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
