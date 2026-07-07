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
  // 발신 중(링백) 팝업에 "OO에게 전화 거는 중" 식으로 보여줄 상대/방 이름.
  calleeLabel: string | null;
};

const STORAGE_KEY = "bubli:voice-store";
const CHANNEL_NAME = "bubli:voice-store-sync";

type VoiceStoreMessage =
  | { type: "request" }
  | { snapshot: VoiceStoreSnapshot; type: "sync" };

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
  calleeLabel: null,
};
const _serverSnapshot: VoiceStoreSnapshot = _default;
let _snapshot: VoiceStoreSnapshot = readStorage() ?? _default;
const _listeners = new Set<() => void>();
let _channel: BroadcastChannel | null = null;

function notifyListeners() {
  _listeners.forEach((listener) => listener());
}

function applyExternalSnapshot(snapshot: VoiceStoreSnapshot) {
  _snapshot = snapshot.voice.kind === "ready" ? { ...snapshot, isSpeaking: false } : _default;
  writeStorage(_snapshot);
  notifyListeners();
}

if (typeof window !== "undefined") {
  try {
    _channel = new BroadcastChannel(CHANNEL_NAME);
    _channel.addEventListener("message", (event: MessageEvent<VoiceStoreMessage>) => {
      if (event.data.type === "request") {
        _channel?.postMessage({ snapshot: _snapshot, type: "sync" } satisfies VoiceStoreMessage);
        return;
      }
      applyExternalSnapshot(event.data.snapshot);
    });
    window.setTimeout(() => _channel?.postMessage({ type: "request" } satisfies VoiceStoreMessage), 0);
  } catch {
    _channel = null;
  }
}

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
    _channel?.postMessage({ snapshot: _snapshot, type: "sync" } satisfies VoiceStoreMessage);
    notifyListeners();
  },
};
