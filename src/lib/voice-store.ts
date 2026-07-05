type VoiceState = {
  voiceRoomId: string | null;
  participantId: string | null;
  micStatus: "MUTED" | "UNMUTED";
  status: "idle" | "joining" | "joined";
};

const STORAGE_KEY = "bubli_voice_state";

const defaultState: VoiceState = {
  voiceRoomId: null,
  participantId: null,
  micStatus: "UNMUTED",
  status: "idle",
};

function loadFromStorage(): VoiceState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState, ...JSON.parse(raw) };
  } catch {}
  return defaultState;
}

function saveToStorage(state: VoiceState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function createVoiceStore() {
  let state: VoiceState = loadFromStorage();
  const listeners = new Set<() => void>();

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot(): VoiceState {
      return state;
    },
    update(partial: Partial<VoiceState>) {
      state = { ...state, ...partial };
      saveToStorage(state);
      listeners.forEach((l) => l());
    },
  };
}

export const voiceStore = createVoiceStore();
export type { VoiceState };
