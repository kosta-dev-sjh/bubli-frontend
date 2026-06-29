// Storybook Visual QA 자동화
// 1) Storybook 정적 빌드 → 2) 미니 정적 서버 → 3) Playwright/Chromium 캡처
// → 4) docs/visual-qa/screenshots 저장 → 5) 금지색 grep → 6) typecheck → 7) 리포트 md
//
// 실행: node scripts/visual-qa.mjs  (= npm run visual:qa)
// 옵션 env: SKIP_BUILD=1 (storybook-static 재사용), SKIP_TSC=1
//
// 라우트/디자인/API/Tauri는 건드리지 않는다. 읽기·캡처·검증만 한다.

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const STATIC_DIR = path.join(ROOT, "storybook-static");
const SHOT_DIR = path.join(ROOT, "docs", "visual-qa", "screenshots");
const REPORT = path.join(ROOT, "docs", "visual-qa", "visual-qa-report.md");

// ---- 캡처 대상 (title + story 이름). 정확한 id는 index.json에서 조회한다 ----
const TARGETS = [
  { title: "Dashboard/View", story: "Default", file: "dashboard-view-default.png" },
  { title: "Dashboard/View", story: "Dark", file: "dashboard-view-dark.png" },
  { title: "Dashboard/CustomizingFlow", story: "CustomizingFlow", file: "dashboard-customizing-flow.png" },
  { title: "Widget/WidgetShell", story: "AllStates", file: "widget-shell-allstates.png" },
  { title: "Widget/WidgetPreview", story: "Default", file: "widget-preview-default.png" },
  { title: "Widget/WidgetPreview", story: "Ghost", file: "widget-preview-ghost.png" },
  { title: "Widget/WidgetPreview", story: "Minimal", file: "widget-preview-minimal.png" },
  { title: "Widget/WidgetPreview", story: "Dark", file: "widget-preview-dark.png" },
  { title: "Domain/ResourceFlowView", story: "Default", file: "resource-flow-default.png" },
  { title: "Domain/ResourceFlowView", story: "Dark", file: "resource-flow-dark.png" },
  { title: "UI/Button", story: "AllVariants", file: "ui-button-allvariants.png", alt: ["Variants", "States", "Default"] },
  { title: "UI/GlassPanel", story: "Default", file: "ui-glasspanel-default.png" },
  { title: "UI/Ring", story: "ProjectTime", file: "ui-ring-projecttime.png", alt: ["Time", "Default", "Segments"] },
  { title: "Bubbles/BubbleMark", story: "Default", file: "bubbles-bubblemark.png" },
  { title: "Bubbles/AgentBubble", story: "States", file: "bubbles-agentbubble-states.png", alt: ["Default", "AllStates"] },
  { title: "Bubbles/BubbleBar", story: "Default", file: "bubbles-bubblebar-default.png" },
];

// ---- 실제 Next 라우트 캡처 대상 (DashboardView를 flag on으로 렌더) ----
const ROUTE_PORT = 3789;
const ROUTES = [
  { path: "/", scheme: "light", file: "route-home-light.png", label: "Route / (공개 랜딩·light)" },
  { path: "/", scheme: "dark", file: "route-home-dark.png", label: "Route / (공개 랜딩·dark)" },
  { path: "/app", scheme: "light", file: "route-dashboard-light.png", label: "Route /app (DashboardView·light)" },
  { path: "/app", scheme: "dark", file: "route-dashboard-dark.png", label: "Route /app (DashboardView·dark)" },
  { path: "/app/resources", scheme: "light", file: "route-resources-light.png", label: "Route /app/resources (ResourceFlowView·light)" },
  { path: "/app/resources", scheme: "dark", file: "route-resources-dark.png", label: "Route /app/resources (ResourceFlowView·dark)" },
];

const BANNED = ["#2E8E8A", "#8FD8D3", "#56B3AB", "#5FC9D6", "aqua", "teal", "mint"];
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

function log(...a) {
  console.log("[visual-qa]", ...a);
}

function sh(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", shell: false, ...opts });
}

// ---- 1) Storybook 정적 빌드 ----
function buildStorybook() {
  if (process.env.SKIP_BUILD === "1" && existsSync(path.join(STATIC_DIR, "index.json"))) {
    log("SKIP_BUILD=1 → storybook-static 재사용");
    return { ok: true, skipped: true };
  }
  log("storybook build 시작 (시간이 걸릴 수 있다)...");
  const r = sh("npx", ["storybook", "build", "-o", "storybook-static", "--quiet"], { stdio: "inherit" });
  const ok = r.status === 0 && existsSync(path.join(STATIC_DIR, "index.json"));
  return { ok, status: r.status, error: r.error?.message };
}

// ---- 2) 미니 정적 서버 ----
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".css": "text/css", ".png": "image/png",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".woff": "font/woff", ".ico": "image/x-icon", ".map": "application/json",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        let rel = decodeURIComponent(req.url.split("?")[0]);
        if (rel === "/") rel = "/index.html";
        const fp = path.join(STATIC_DIR, path.normalize(rel));
        if (!fp.startsWith(STATIC_DIR)) { res.writeHead(403).end(); return; }
        const buf = await readFile(fp);
        res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "application/octet-stream" });
        res.end(buf);
      } catch {
        res.writeHead(404).end("not found");
      }
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

// ---- index.json에서 정확한 story id 조회 ----
async function loadIndex() {
  const raw = JSON.parse(await readFile(path.join(STATIC_DIR, "index.json"), "utf8"));
  const entries = raw.entries || raw.stories || {};
  return Object.values(entries).filter((e) => (e.type ?? "story") === "story");
}

function resolveId(stories, t) {
  const wantNames = [t.story, ...(t.alt || [])].map(norm);
  const sameTitle = stories.filter((s) => s.title === t.title);
  for (const want of wantNames) {
    const hit = sameTitle.find((s) => norm(s.name) === want || norm(s.id.split("--")[1] || "") === want);
    if (hit) return hit.id;
  }
  // title만 같으면 첫 스토리로 폴백(이름 불일치 표시)
  if (sameTitle[0]) return sameTitle[0].id + " (이름 불일치 폴백)";
  return null;
}

// ---- 5) 금지색 grep (src 스캔) ----
async function bannedScan() {
  const hits = [];
  async function walk(dir) {
    for (const d of await readdir(dir, { withFileTypes: true })) {
      if (d.name === "node_modules" || d.name.startsWith(".")) continue;
      const fp = path.join(dir, d.name);
      if (d.isDirectory()) { await walk(fp); continue; }
      if (!/\.(tsx?|css|mjs)$/.test(d.name)) continue;
      const text = await readFile(fp, "utf8");
      text.split("\n").forEach((line, i) => {
        for (const b of BANNED) {
          const re = /^[#]/.test(b) ? new RegExp(b, "i") : new RegExp(`\\b${b}\\b`, "i");
          if (re.test(line) && !/banned|금지|schema|\/\//i.test(line)) {
            hits.push(`${path.relative(ROOT, fp)}:${i + 1}: ${line.trim().slice(0, 80)}`);
          }
        }
      });
    }
  }
  await walk(path.join(ROOT, "src"));
  return hits;
}

// ---- 실제 Next 라우트 캡처 (next dev 기동 → flag on → /app 캡처) ----
async function waitForServer(url, ms = 90000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(url, { method: "GET" });
      if (r.ok) return true;
    } catch {
      /* 아직 안 뜸 */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function captureRoutes(browser) {
  const results = [];
  log("next dev 기동 (NEXT_PUBLIC_BUBLI_NEW_DASHBOARD=true)...");
  const dev = spawn("npx", ["next", "dev", "-p", String(ROUTE_PORT)], {
    cwd: ROOT,
    env: {
      ...process.env,
      NEXT_PUBLIC_BUBLI_NEW_DASHBOARD: "true",
      NEXT_PUBLIC_BUBLI_NEW_RESOURCES: "true",
      NEXT_PUBLIC_BUBLI_NEW_WIDGET_PREVIEW: "true",
      BROWSER: "none",
    },
    stdio: "ignore",
  });
  try {
    const ready = await waitForServer(`http://127.0.0.1:${ROUTE_PORT}/app`);
    if (!ready) {
      ROUTES.forEach((r) => results.push({ ...r, ok: false, reason: "next dev 준비 시간 초과" }));
      return results;
    }
    for (const r of ROUTES) {
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
        colorScheme: r.scheme,
      });
      // ThemeProvider는 localStorage(bubli-theme)를 먼저 읽는다. system+colorScheme만으론
      // 라우트에서 다크가 안 잡히므로 테마를 명시 주입한다(light/dark 결정적 캡처).
      await ctx.addInitScript((theme) => {
        try {
          window.localStorage.setItem("bubli-theme", theme);
        } catch {
          /* noop */
        }
      }, r.scheme);
      const page = await ctx.newPage();
      try {
        await page.goto(`http://127.0.0.1:${ROUTE_PORT}${r.path}`, { waitUntil: "networkidle", timeout: 60000 });
        await page.waitForTimeout(1000); // 마운트 + 테마 effect
        // ThemeProvider 타이밍에 의존하지 않고 캡처용으로 data-theme를 직접 고정한다.
        await page.evaluate((theme) => {
          document.documentElement.setAttribute("data-theme", theme);
        }, r.scheme);
        await page.waitForTimeout(400); // 다크 전이 안정화
        await page.screenshot({ path: path.join(SHOT_DIR, r.file) });
        results.push({ ...r, ok: true });
        log("라우트 캡처:", r.file);
      } catch (e) {
        results.push({ ...r, ok: false, reason: e.message.split("\n")[0] });
        log("라우트 실패:", r.file, e.message.split("\n")[0]);
      } finally {
        await ctx.close();
      }
    }
  } finally {
    dev.kill("SIGTERM");
  }
  return results;
}

async function main() {
  const started = new Date();
  await mkdir(SHOT_DIR, { recursive: true });

  // Playwright 로드(미설치 시 중단)
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    const msg = "Playwright 미설치. `npm i -D playwright && npx playwright install chromium` 후 다시 실행.";
    log("중단:", msg);
    await writeReport({ started, aborted: msg, captures: [], banned: null, tsc: null, build: null });
    process.exit(2);
  }

  // 1) build
  const build = buildStorybook();
  if (!build.ok) {
    const msg = `storybook build 실패 (status=${build.status ?? "?"}) ${build.error ?? ""}`;
    log("중단:", msg);
    await writeReport({ started, aborted: msg, captures: [], banned: await bannedScan(), tsc: null, build });
    process.exit(3);
  }

  // 2) serve
  const { server, port } = await startServer();
  const base = `http://127.0.0.1:${port}`;
  log("정적 서버:", base);

  // 3) capture
  const stories = await loadIndex();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();

  const captures = [];
  for (const t of TARGETS) {
    const idRaw = resolveId(stories, t);
    if (!idRaw) { captures.push({ ...t, ok: false, reason: "story id 없음" }); continue; }
    const id = idRaw.replace(/ .*$/, "");
    const url = `${base}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`;
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForSelector("#storybook-root, #root", { timeout: 15000 });
      await page.waitForTimeout(500); // 안정화
      const dest = path.join(SHOT_DIR, t.file);
      const root = await page.$("#storybook-root, #root");
      if (root) await root.screenshot({ path: dest });
      else await page.screenshot({ path: dest });
      captures.push({ ...t, ok: true, id: idRaw });
      log("캡처:", t.file, "←", id);
    } catch (e) {
      captures.push({ ...t, ok: false, id: idRaw, reason: e.message.split("\n")[0] });
      log("실패:", t.file, e.message.split("\n")[0]);
    }
  }

  // 3b) 실제 라우트 캡처 (옵션: SKIP_ROUTES=1로 생략). storybook 캡처를 깨지 않게 격리.
  let routes = [];
  if (process.env.SKIP_ROUTES !== "1") {
    try {
      routes = await captureRoutes(browser);
    } catch (e) {
      log("라우트 캡처 예외:", e.message.split("\n")[0]);
      ROUTES.forEach((r) => routes.push({ ...r, ok: false, reason: e.message.split("\n")[0] }));
    }
  }
  for (const r of routes) captures.push({ title: r.label, story: r.scheme, file: r.file, ok: r.ok, reason: r.reason, id: "route" });

  await browser.close();
  server.close();

  // 5) banned grep, 6) tsc
  const banned = await bannedScan();
  let tsc = null;
  if (process.env.SKIP_TSC !== "1") {
    log("typecheck...");
    const r = sh("npx", ["tsc", "--noEmit"]);
    tsc = { ok: r.status === 0, status: r.status, out: (r.stdout || "").split("\n").filter((l) => /error TS/.test(l)).slice(0, 10) };
  }

  await writeReport({ started, aborted: null, captures, banned, tsc, build });

  const okCount = captures.filter((c) => c.ok).length;
  // ROUTES_OPTIONAL=1이면 라우트 캡처는 아티팩트로만 두고, 통과 판정은 Storybook 캡처로 한다.
  const gate = process.env.ROUTES_OPTIONAL === "1" ? captures.filter((c) => c.id !== "route") : captures;
  const gateOk = gate.filter((c) => c.ok).length === gate.length;
  log(`완료: 캡처 ${okCount}/${captures.length} (게이트 ${gate.filter((c) => c.ok).length}/${gate.length}), 금지색 ${banned.length}, tsc ${tsc ? (tsc.ok ? "OK" : "FAIL") : "skip"}`);
  process.exit(gateOk && banned.length === 0 && (!tsc || tsc.ok) ? 0 : 1);
}

async function writeReport({ started, aborted, captures, banned, tsc, build }) {
  const fin = new Date();
  const ok = captures.filter((c) => c.ok);
  const fail = captures.filter((c) => !c.ok);
  const lines = [];
  lines.push("# Visual QA 자동 리포트", "");
  lines.push(`- 실행 시작: ${started.toISOString()}`);
  lines.push(`- 실행 종료: ${fin.toISOString()}`);
  lines.push(`- 소요: ${((fin - started) / 1000).toFixed(1)}s`, "");
  if (aborted) {
    lines.push("## 중단", "", `사유: ${aborted}`, "");
  }
  lines.push("## Storybook 빌드", "", build ? (build.skipped ? "재사용(SKIP_BUILD)" : build.ok ? "성공" : `실패 status=${build.status}`) : "미실행", "");
  lines.push("## 캡처 성공", "");
  if (ok.length) ok.forEach((c) => lines.push(`- ${c.title} → ${c.story} : \`docs/visual-qa/screenshots/${c.file}\` (id: ${c.id})`));
  else lines.push("- 없음");
  lines.push("", "## 캡처 실패", "");
  if (fail.length) fail.forEach((c) => lines.push(`- ${c.title} → ${c.story} : ${c.reason}`));
  else lines.push("- 없음");
  lines.push("", "## typecheck", "", tsc ? (tsc.ok ? "통과 (exit 0)" : `실패 (status=${tsc.status})\n\n${tsc.out.join("\n")}`) : "건너뜀", "");
  lines.push("## 금지색 grep (청록/민트/aqua/teal)", "", banned == null ? "미실행" : banned.length === 0 ? "0건" : banned.map((h) => `- ${h}`).join("\n"), "");
  lines.push("## 다음 조치", "");
  if (aborted) lines.push("- 설치/빌드 문제 해결 후 재실행.");
  else if (fail.length) lines.push("- 실패 스토리의 story id/렌더 확인 후 재실행.");
  else lines.push("- 스크린샷 검토 후 라우트 적용 자동화로 진행 가능.");
  await writeFile(REPORT, lines.join("\n") + "\n", "utf8");
  log("리포트:", path.relative(ROOT, REPORT));
}

main().catch(async (e) => {
  log("예외:", e.message);
  process.exit(1);
});
