import { tauriCommands } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

export type TauriStartupOptimizationProfile = "aggressive" | "balanced" | "fast" | "windows";

export type TauriStartupOptimizationConfig = {
  bubbleOpenStaggerMs: number;
  deferredBarFullDisplayDelayMs: number;
  deferBarFullDisplayUntilAfterFirstPaint: boolean;
  initialDisplayPageSize: number;
  initialNotificationScanPages: number;
  menuOrbBadgeRefreshIntervalMs: number;
  openCommandTimeoutMs: number;
  preloadWidgetSettingsDuringStartup: boolean;
  profile: TauriStartupOptimizationProfile;
  requireMenuWindowDuringStartupReuse: boolean;
  retryAttempts: number;
  retryDelayMs: number;
  settingsTimeoutMs: number;
  summaryPrewarmTimeoutMs: number;
  widgetContextRefreshIntervalMs: number;
};

const STARTUP_OPTIMIZATION_CACHE_KEY = "tauri-runtime";
const STARTUP_OPTIMIZATION_KIND = "startup_optimization_profile";
const STARTUP_OPTIMIZATION_PLATFORM = "windows";
let startupOptimizationConfigPromise: Promise<TauriStartupOptimizationConfig> | null = null;

const profileConfigs: Record<TauriStartupOptimizationProfile, TauriStartupOptimizationConfig> = {
  aggressive: {
    bubbleOpenStaggerMs: 180,
    deferredBarFullDisplayDelayMs: 1_200,
    deferBarFullDisplayUntilAfterFirstPaint: true,
    initialDisplayPageSize: 0,
    initialNotificationScanPages: 0,
    menuOrbBadgeRefreshIntervalMs: 8_000,
    openCommandTimeoutMs: 6_000,
    preloadWidgetSettingsDuringStartup: true,
    profile: "aggressive",
    requireMenuWindowDuringStartupReuse: false,
    retryAttempts: 1,
    retryDelayMs: 450,
    settingsTimeoutMs: 650,
    summaryPrewarmTimeoutMs: 900,
    widgetContextRefreshIntervalMs: 15_000,
  },
  balanced: {
    bubbleOpenStaggerMs: 0,
    deferredBarFullDisplayDelayMs: 0,
    deferBarFullDisplayUntilAfterFirstPaint: false,
    initialDisplayPageSize: 0,
    initialNotificationScanPages: 0,
    menuOrbBadgeRefreshIntervalMs: 8_000,
    openCommandTimeoutMs: 10_000,
    preloadWidgetSettingsDuringStartup: true,
    profile: "balanced",
    requireMenuWindowDuringStartupReuse: false,
    retryAttempts: 2,
    retryDelayMs: 650,
    settingsTimeoutMs: 2_500,
    summaryPrewarmTimeoutMs: 0,
    widgetContextRefreshIntervalMs: 15_000,
  },
  fast: {
    bubbleOpenStaggerMs: 90,
    deferredBarFullDisplayDelayMs: 750,
    deferBarFullDisplayUntilAfterFirstPaint: true,
    initialDisplayPageSize: 0,
    initialNotificationScanPages: 0,
    menuOrbBadgeRefreshIntervalMs: 8_000,
    openCommandTimeoutMs: 8_000,
    preloadWidgetSettingsDuringStartup: true,
    profile: "fast",
    requireMenuWindowDuringStartupReuse: false,
    retryAttempts: 2,
    retryDelayMs: 550,
    settingsTimeoutMs: 1_200,
    summaryPrewarmTimeoutMs: 1_400,
    widgetContextRefreshIntervalMs: 15_000,
  },
  windows: {
    bubbleOpenStaggerMs: 0,
    deferredBarFullDisplayDelayMs: 350,
    deferBarFullDisplayUntilAfterFirstPaint: true,
    initialDisplayPageSize: 30,
    initialNotificationScanPages: 2,
    menuOrbBadgeRefreshIntervalMs: 20_000,
    openCommandTimeoutMs: 8_000,
    preloadWidgetSettingsDuringStartup: false,
    profile: "windows",
    requireMenuWindowDuringStartupReuse: true,
    retryAttempts: 2,
    retryDelayMs: 500,
    settingsTimeoutMs: 1_000,
    summaryPrewarmTimeoutMs: 1_800,
    widgetContextRefreshIntervalMs: 30_000,
  },
};

function normalizeProfile(value: unknown): TauriStartupOptimizationProfile | null {
  if (value === "aggressive" || value === "balanced" || value === "fast" || value === "windows") return value;
  return null;
}

function normalizeProfileOrDefault(value: unknown): TauriStartupOptimizationProfile {
  return normalizeProfile(value) ?? "fast";
}

function resolveDefaultProfile(): TauriStartupOptimizationProfile {
  const configured = normalizeProfile(process.env.NEXT_PUBLIC_BUBLI_TAURI_STARTUP_PROFILE);
  if (configured) return configured;

  return isWindowsRuntime() ? "windows" : "fast";
}

function isWindowsRuntime() {
  return isTauriRuntime() && typeof navigator !== "undefined" && /\bWindows\b/i.test(navigator.userAgent);
}

function resolveCachedProfile(parsed: { platform?: unknown; profile?: unknown }): TauriStartupOptimizationProfile {
  const cachedProfile = normalizeProfile(parsed.profile);
  if (isWindowsRuntime() && parsed.platform !== STARTUP_OPTIMIZATION_PLATFORM) return "windows";
  return cachedProfile ?? resolveDefaultProfile();
}

export function defaultTauriStartupOptimizationConfig(): TauriStartupOptimizationConfig {
  return profileConfigs[resolveDefaultProfile()];
}

export async function readTauriStartupOptimizationConfig(): Promise<TauriStartupOptimizationConfig> {
  if (!isTauriRuntime()) return defaultTauriStartupOptimizationConfig();
  if (startupOptimizationConfigPromise) return startupOptimizationConfigPromise;

  startupOptimizationConfigPromise = (async () => {
    const cached = await tauriCommands.readWidgetPref({
      cacheKey: STARTUP_OPTIMIZATION_CACHE_KEY,
      kind: STARTUP_OPTIMIZATION_KIND,
    });
    if (!cached) return defaultTauriStartupOptimizationConfig();
    const parsed = JSON.parse(cached.valueJson) as { platform?: unknown; profile?: unknown };
    return profileConfigs[resolveCachedProfile(parsed)];
  })().catch(() => defaultTauriStartupOptimizationConfig());

  try {
    return await startupOptimizationConfigPromise;
  } catch {
    return defaultTauriStartupOptimizationConfig();
  }
}

export async function writeTauriStartupOptimizationProfile(profile: TauriStartupOptimizationProfile): Promise<void> {
  if (!isTauriRuntime()) return;

  startupOptimizationConfigPromise = Promise.resolve(profileConfigs[normalizeProfileOrDefault(profile)]);
  await tauriCommands.storeWidgetPref({
    cacheKey: STARTUP_OPTIMIZATION_CACHE_KEY,
    kind: STARTUP_OPTIMIZATION_KIND,
    valueJson: JSON.stringify({
      platform: isWindowsRuntime() ? STARTUP_OPTIMIZATION_PLATFORM : "default",
      profile: normalizeProfileOrDefault(profile),
    }),
  });
}
