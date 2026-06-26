import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_ROOTS = ["src", ".storybook"];
const SOURCE_EXTENSIONS = new Set([".css", ".js", ".jsx", ".ts", ".tsx"]);
const HEX_SOURCE_FILES = new Set(["src/styles/globals.css", ".storybook/preview.ts"]);

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
      if (!HEX_SOURCE_FILES.has(relativePath)) {
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
