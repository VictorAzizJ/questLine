export type TimerKind = "focus" | "break";

export type TimerPersistedState = {
  kind: TimerKind;
  isRunning: boolean;
  durationSeconds: number;
  remainingSeconds: number; // only authoritative when paused
  startedAtMs?: number;
  endAtMs?: number;
};

export type GameContext = {
  gameId?: string;
  playerId?: string;
};

export type ExtensionSettings = {
  convexUrl?: string;
  webAppUrl?: string;
};

export type BackgroundSnapshot = {
  timer: {
    kind: TimerKind;
    isRunning: boolean;
    remainingSeconds: number;
    durationSeconds: number;
    startedAtMs?: number;
    endAtMs?: number;
  };
  context: GameContext;
  settings: ExtensionSettings;
  gameSync?: {
    phase?: string;
    pendingAction?: boolean;
    pendingVote?: boolean;
    lastCheckedAtMs?: number;
    error?: string;
  };
};

export type BackgroundRequest =
  | { type: "GET_SNAPSHOT" }
  | { type: "TIMER_START" }
  | { type: "TIMER_PAUSE" }
  | { type: "TIMER_RESET"; kind?: TimerKind; durationSeconds?: number }
  | { type: "CONTEXT_SET"; gameId?: string; playerId?: string }
  | { type: "SETTINGS_SET"; settings: ExtensionSettings }
  | { type: "OPEN_WEB_APP" };

export type BackgroundResponse =
  | { ok: true; snapshot?: BackgroundSnapshot }
  | { ok: false; error: string };
