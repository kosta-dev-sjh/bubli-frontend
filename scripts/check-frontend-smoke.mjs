const NEXT_BASE_URL = normalizeBaseUrl(process.env.NEXT_BASE_URL ?? "http://localhost:3000");
const STORYBOOK_BASE_URL = normalizeBaseUrl(process.env.STORYBOOK_BASE_URL ?? "http://localhost:6006");
const TARGET = process.env.SMOKE_TARGET ?? "all";

const ROUTES = [
  "/",
  "/features",
  "/faq",
  "/login",
  "/app",
  "/app/project-rooms",
  "/app/resources",
  "/app/project-rooms/demo-room/work",
  "/app/chat",
  "/app/calendar",
  "/app/agent-suggestions",
  "/app/settings",
  "/app/desktop/communication",
];

const STORIES = [
  "features-publicsite-publichero--default",
  "features-auth-authpanel--login",
  "features-resources-resourceboard--default",
  "features-projectroom-projectroomcreateflowpanel--default",
  "features-wbs-wbstodolinkagepanel--link-one-task-across-surfaces",
  "features-agent-candidateapprovalpanel--default",
  "features-communication-tauricommunicationmodepanel--web-chat-tab",
  "features-timer-timerrecoveryboundarypanel--running",
  "features-managedfolder-managedfoldersyncpanel--default",
  "features-dashboard-dashboardfivecardpanel--ready",
  "features-wbs-wbsfourviewtogglepanel--tree",
  "features-widget-widgeteightbubblesetpanel--ready",
  "features-agent-agentsuggestioninboxpanel--ready",
  "features-calendar-calendarpagepanel--ready",
];

if (!["all", "routes", "storybook"].includes(TARGET)) {
  console.error(`Unknown SMOKE_TARGET "${TARGET}". Use all, routes, or storybook.`);
  process.exit(1);
}

const failures = [];

if (TARGET === "all" || TARGET === "routes") {
  await checkRoutes();
}

if (TARGET === "all" || TARGET === "storybook") {
  await checkStorybook();
}

if (failures.length > 0) {
  console.error(`\nSmoke check failed: ${failures.length} issue(s).`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\nSmoke check passed.");

async function checkRoutes() {
  console.log(`\nChecking Next routes at ${NEXT_BASE_URL}`);

  for (const route of ROUTES) {
    const url = `${NEXT_BASE_URL}${route}`;

    try {
      const response = await fetch(url, { redirect: "manual" });
      const text = await response.text();

      if (!isOkStatus(response.status)) {
        failures.push(`Route ${route} returned HTTP ${response.status}.`);
        console.log(`FAIL route ${route} (${response.status})`);
        continue;
      }

      if (text.length < 200) {
        failures.push(`Route ${route} returned an unexpectedly small response.`);
        console.log(`FAIL route ${route} (small response)`);
        continue;
      }

      console.log(`PASS route ${route} (${response.status}, ${text.length} bytes)`);
    } catch (error) {
      failures.push(
        `Next dev server is not reachable at ${NEXT_BASE_URL}. Run npm run dev. ${formatError(error)}`,
      );
      console.log(`FAIL route ${route} (server unreachable)`);
      break;
    }
  }
}

async function checkStorybook() {
  console.log(`\nChecking Storybook stories at ${STORYBOOK_BASE_URL}`);

  let storyIndex;
  try {
    const response = await fetch(`${STORYBOOK_BASE_URL}/index.json`);
    if (!isOkStatus(response.status)) {
      failures.push(`Storybook index returned HTTP ${response.status}.`);
      return;
    }
    storyIndex = await response.json();
  } catch (error) {
    failures.push(
      `Storybook server is not reachable at ${STORYBOOK_BASE_URL}. Run npm run storybook. ${formatError(error)}`,
    );
    return;
  }

  const storyEntries = storyIndex.entries ?? storyIndex.stories ?? {};

  for (const storyId of STORIES) {
    if (!storyEntries[storyId]) {
      failures.push(`Storybook index does not include ${storyId}.`);
      console.log(`FAIL story ${storyId} (missing index entry)`);
      continue;
    }

    const url = `${STORYBOOK_BASE_URL}/iframe.html?id=${storyId}&viewMode=story`;

    try {
      const response = await fetch(url);
      const text = await response.text();

      if (!isOkStatus(response.status)) {
        failures.push(`Story ${storyId} returned HTTP ${response.status}.`);
        console.log(`FAIL story ${storyId} (${response.status})`);
        continue;
      }

      if (!text.includes("storybook-root") && !text.includes("__storybook")) {
        failures.push(`Story ${storyId} did not return a recognizable Storybook iframe.`);
        console.log(`FAIL story ${storyId} (unexpected iframe)`);
        continue;
      }

      console.log(`PASS story ${storyId} (${response.status}, ${text.length} bytes)`);
    } catch (error) {
      failures.push(`Story ${storyId} could not be fetched. ${formatError(error)}`);
      console.log(`FAIL story ${storyId} (fetch error)`);
    }
  }
}

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, "");
}

function isOkStatus(status) {
  return status >= 200 && status < 400;
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
