import { tauriCommands } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

export type TauriStartupOptimizationProfile = "aggressive" | "balanced" | "fast";

export type TauriStartupOptimizationConfig = {
  bubbleOpenStaggerMs: number;
  deferredBarFullDisplayDelayMs: number;
  deferBarFullDisplayUntilAfterFirstPaint: boolean;
  openCommandTimeoutMs: number;
  profile: TauriStartupOptimizationProfile;
  retryAttempts: number;
  retryDelayMs: number;
  settingsTimeoutMs: number;
};

const STARTUP_OPTIMIZATION_CACHE_KEY = "tauri-runtime";
const STARTUP_OPTIMIZATION_KIND = "startup_optimization_profile";
const defaultProfile: TauriStartupOptimizationProfile = "fast";

const profileConfigs: Record<TauriStartupOptimizationProfile, TauriStartupOptimizationConfig> = {
  aggressive: {
    bubbleOpenStaggerMs: 180,
    deferredBarFullDisplayDelayMs: 1_200,
    deferBarFullDisplayUntilAfterFirstPaint: true,
    openCommandTimeoutMs: 6_000,
    profile: "aggressive",
    retryAttempts: 1,
    retryDelayMs: 450,
    settingsTimeoutMs: 650,
  },
  balanced: {
    bubbleOpenStaggerMs: 0,
    deferredBarFullDisplayDelayMs: 0,
    deferBarFullDisplayUntilAfterFirstPaint: false,
    openCommandTimeoutMs: 10_000,
    profile: "balanced",
    retryAttempts: 2,
    retryDelayMs: 650,
    settingsTimeoutMs: 2_500,
  },
  fast: {
    bubbleOpenStaggerMs: 90,
    deferredBarFullDisplayDelayMs: 750,
    deferBarFullDisplayUntilAfterFirstPaint: true,
    openCommandTimeoutMs: 8_000,
    profile: "fast",
    retryAttempts: 2,
    retryDelayMs: 550,
    settingsTimeoutMs: 1_200,
  },
};

function normalizeProfile(value: unknown): TauriStartupOptimizationProfile {
  if (value === "aggressive" || value === "balanced" || value === "fast") return value;
  return defaultProfile;
}

export function defaultTauriStartupOptimizationConfig(): TauriStartupOptimizationConfig {
  return profileConfigs[defaultProfile];
}

export async function readTauriStartupOptimizationConfig(): Promise<TauriStartupOptimizationConfig> {
  if (!isTauriRuntime()) return defaultTauriStartupOptimizationConfig();

  try {
    const cached = await tauriCommands.readWidgetPref({
      cacheKey: STARTUP_OPTIMIZATION_CACHE_KEY,
      kind: STARTUP_OPTIMIZATION_KIND,
    });
    if (!cached) return defaultTauriStartupOptimizationConfig();
    const parsed = JSON.parse(cached.valueJson) as { profile?: unknown };
    return profileConfigs[normalizeProfile(parsed.profile)];
  } catch {
    return defaultTauriStartupOptimizationConfig();
  }
}

export async function writeTauriStartupOptimizationProfile(profile: TauriStartupOptimizationProfile): Promise<void> {
  if (!isTauriRuntime()) return;

  await tauriCommands.storeWidgetPref({
    cacheKey: STARTUP_OPTIMIZATION_CACHE_KEY,
    kind: STARTUP_OPTIMIZATION_KIND,
    valueJson: JSON.stringify({ profile: normalizeProfile(profile) }),
  });
}
