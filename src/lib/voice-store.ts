import type { VoiceRoomResponse } from "@/types/api/voice";

export type VoiceStoreVoiceState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "ready"; room: VoiceRoomResponse }
  | { kind: "blocked"; message: string };

type VoiceStoreSnapshot = {
  expanded: boolean;
  selectedChatRoomId: string | null;
  voice: VoiceStoreVoiceState;
  micMuted: boolean;
  isSpeaking: boolean;
};

const STORAGE_KEY = "bubli:voice-store";

function readStorage(): VoiceStoreSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VoiceStoreSnapshot;
    if (parsed.voice?.kind !== "ready") return null;
    return { ...parsed, isSpeaking: false };
  } catch {
    return null;
  }
}

function writeStorage(snapshot: VoiceStoreSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    if (snapshot.voice.kind === "ready") {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

const _default: VoiceStoreSnapshot = {
  expanded: false,
  selectedChatRoomId: null,
  voice: { kind: "idle" },
  micMuted: false,
  isSpeaking: false,
};
const _serverSnapshot: VoiceStoreSnapshot = _default;
let _snapshot: VoiceStoreSnapshot = readStorage() ?? _default;
const _listeners = new Set<() => void>();

export const voiceStore = {
  subscribe(listener: () => void): () => void {
    _listeners.add(listener);
    return () => void _listeners.delete(listener);
  },
  getSnapshot(): VoiceStoreSnapshot {
    return _snapshot;
  },
  getServerSnapshot(): VoiceStoreSnapshot {
    return _serverSnapshot;
  },
  update(patch: Partial<VoiceStoreSnapshot>): void {
    _snapshot = { ..._snapshot, ...patch };
    writeStorage(_snapshot);
    _listeners.forEach((l) => l());
  },
};
