import type { SessionSettings, SessionType } from "@questline/types";

/**
 * Formats seconds into MM:SS display
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formats seconds into human-readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) {
    return `${mins}m`;
  }
  return `${mins}m ${secs}s`;
}

/**
 * Gets the next session type in the cycle
 */
export function getNextSessionType(
  currentType: SessionType,
  completedCycles: number,
  settings: SessionSettings
): SessionType {
  if (currentType === "focus") {
    // After focus, take a break
    if ((completedCycles + 1) % settings.cyclesBeforeLongBreak === 0) {
      return "break"; // Long break (handled by duration)
    }
    return "break"; // Short break
  }

  // After break, do focus
  return "focus";
}

/**
 * Gets the duration for a session type
 */
export function getSessionDuration(
  type: SessionType,
  completedCycles: number,
  settings: SessionSettings
): number {
  switch (type) {
    case "focus":
      return settings.focusDuration;
    case "break":
      // Long break every N cycles
      if (completedCycles > 0 && completedCycles % settings.cyclesBeforeLongBreak === 0) {
        return settings.longBreakDuration;
      }
      return settings.shortBreakDuration;
    case "planning":
      return 5; // Planning sessions are 5 minutes
    default:
      return settings.focusDuration;
  }
}

/**
 * Calculates progress percentage
 */
export function calculateProgress(elapsedSeconds: number, totalSeconds: number): number {
  if (totalSeconds === 0) return 0;
  return Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100));
}

/**
 * Gets color for timer based on remaining time
 */
export function getTimerColor(remainingSeconds: number, totalSeconds: number): string {
  const percentage = (remainingSeconds / totalSeconds) * 100;
  if (percentage > 50) return "green";
  if (percentage > 25) return "yellow";
  if (percentage > 10) return "orange";
  return "red";
}
