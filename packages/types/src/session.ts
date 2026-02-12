import type { PlayerId } from "./player";

// Session types
export type SessionType = "focus" | "break" | "planning";

// Session status
export type SessionStatus = "pending" | "active" | "paused" | "completed" | "cancelled";

// Focus session
export interface FocusSession {
  id: string;
  gameId: string;
  playerId: PlayerId;
  type: SessionType;
  status: SessionStatus;
  durationMinutes: number;
  startTime: number | null;
  endTime: number | null;
  pausedAt: number | null;
  elapsedSeconds: number;
  completedCycles: number;
  tokensEarned: number;
  createdAt: number;
}

// Session settings
export interface SessionSettings {
  focusDuration: number; // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number; // minutes
  cyclesBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  notifications: boolean;
}

// Timer state
export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  type: SessionType;
  remainingSeconds: number;
  totalSeconds: number;
  currentCycle: number;
}

// Session event for real-time updates
export interface SessionEvent {
  type: "started" | "paused" | "resumed" | "completed" | "cancelled" | "tick";
  sessionId: string;
  playerId: PlayerId;
  timestamp: number;
  data?: {
    tokensEarned?: number;
    elapsedSeconds?: number;
  };
}

// Default session settings
export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  cyclesBeforeLongBreak: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
  notifications: true,
};
