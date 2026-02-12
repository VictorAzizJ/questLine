import type { FocusSession, SessionType, TimerState } from "@questline/types";

export * from "./timer";
export * from "./tokens";
export * from "./integration-modes";

/**
 * Creates a new focus session
 */
export function createSession(
  gameId: string,
  playerId: string,
  type: SessionType,
  durationMinutes: number
): FocusSession {
  return {
    id: generateId(),
    gameId,
    playerId,
    type,
    status: "pending",
    durationMinutes,
    startTime: null,
    endTime: null,
    pausedAt: null,
    elapsedSeconds: 0,
    completedCycles: 0,
    tokensEarned: 0,
    createdAt: Date.now(),
  };
}

/**
 * Starts a session
 */
export function startSession(session: FocusSession): FocusSession {
  if (session.status !== "pending" && session.status !== "paused") {
    throw new Error("Can only start pending or paused sessions");
  }

  return {
    ...session,
    status: "active",
    startTime: session.startTime ?? Date.now(),
    pausedAt: null,
  };
}

/**
 * Pauses a session
 */
export function pauseSession(session: FocusSession): FocusSession {
  if (session.status !== "active") {
    throw new Error("Can only pause active sessions");
  }

  const elapsedSinceStart = session.startTime
    ? Math.floor((Date.now() - session.startTime) / 1000)
    : 0;

  return {
    ...session,
    status: "paused",
    pausedAt: Date.now(),
    elapsedSeconds: elapsedSinceStart,
  };
}

/**
 * Resumes a paused session
 */
export function resumeSession(session: FocusSession): FocusSession {
  if (session.status !== "paused") {
    throw new Error("Can only resume paused sessions");
  }

  return {
    ...session,
    status: "active",
    startTime: Date.now() - session.elapsedSeconds * 1000,
    pausedAt: null,
  };
}

/**
 * Completes a session
 */
export function completeSession(session: FocusSession): FocusSession {
  if (session.status !== "active") {
    throw new Error("Can only complete active sessions");
  }

  const tokensEarned = calculateTokens(session);

  return {
    ...session,
    status: "completed",
    endTime: Date.now(),
    tokensEarned,
    completedCycles: session.completedCycles + 1,
  };
}

/**
 * Cancels a session
 */
export function cancelSession(session: FocusSession): FocusSession {
  return {
    ...session,
    status: "cancelled",
    endTime: Date.now(),
  };
}

/**
 * Calculates tokens earned from a session
 */
export function calculateTokens(session: FocusSession): number {
  // 1 token per 5 minutes of focus time
  const minutesCompleted = Math.floor(session.elapsedSeconds / 60);
  return Math.floor(minutesCompleted / 5);
}

/**
 * Gets the current timer state
 */
export function getTimerState(session: FocusSession): TimerState {
  const totalSeconds = session.durationMinutes * 60;
  let elapsedSeconds = session.elapsedSeconds;

  if (session.status === "active" && session.startTime) {
    elapsedSeconds = Math.floor((Date.now() - session.startTime) / 1000);
  }

  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

  return {
    isRunning: session.status === "active",
    isPaused: session.status === "paused",
    type: session.type,
    remainingSeconds,
    totalSeconds,
    currentCycle: session.completedCycles + 1,
  };
}

/**
 * Checks if a session is complete based on elapsed time
 */
export function isSessionComplete(session: FocusSession): boolean {
  const totalSeconds = session.durationMinutes * 60;
  let elapsedSeconds = session.elapsedSeconds;

  if (session.status === "active" && session.startTime) {
    elapsedSeconds = Math.floor((Date.now() - session.startTime) / 1000);
  }

  return elapsedSeconds >= totalSeconds;
}

/**
 * Generates a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
