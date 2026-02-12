import type {
  GamePhase,
  SessionMode,
  SessionType,
  SessionSettings,
  WerewolfSettings,
} from "@questline/types";

/**
 * Focus-as-Night Mode: Focus session (25min) = Night phase, Break (5min) = Day phase.
 * Game progress is tied to work rhythm.
 */

/**
 * Returns the session type that should run for a given game phase in a given mode.
 * Used to start the correct timer when entering a phase.
 */
export function getSessionTypeForPhase(phase: GamePhase, mode: SessionMode): SessionType | null {
  switch (mode) {
    case "focus-as-night":
      if (phase === "night") return "focus";
      if (phase === "day" || phase === "voting" || phase === "resolution") return "break";
      return null;
    case "action-reward":
      // Sessions are independent; focus earns tokens used in any phase
      return null;
    case "timed-round":
      // One cycle = one round: focus then break for night+day actions
      if (phase === "night") return "focus";
      if (phase === "day" || phase === "voting" || phase === "resolution") return "break";
      return null;
    default:
      return null;
  }
}

/**
 * Returns the game phase that corresponds to a session type in focus-as-night or timed-round mode.
 * Used to sync game phase with completed sessions.
 */
export function getPhaseForSessionType(
  sessionType: SessionType,
  mode: SessionMode
): GamePhase | null {
  if (mode !== "focus-as-night" && mode !== "timed-round") return null;
  if (sessionType === "focus") return "night";
  if (sessionType === "break") return "day";
  return null;
}

/**
 * Total duration in minutes for one full round in timed-round mode (focus + break).
 * Accepts either SessionSettings (shortBreakDuration) or WerewolfSettings (breakDuration).
 */
export function getRoundDurationMinutes(
  mode: SessionMode,
  settings: SessionSettings | Pick<WerewolfSettings, "focusDuration" | "breakDuration">
): number {
  if (mode !== "timed-round") return 0;
  const focus = settings.focusDuration;
  const breakDur =
    "shortBreakDuration" in settings
      ? (settings as SessionSettings).shortBreakDuration
      : (settings as Pick<WerewolfSettings, "breakDuration">).breakDuration;
  return focus + breakDur;
}

/**
 * Whether completing a focus session should award action tokens (action-reward mode).
 */
export function shouldAwardTokensOnFocusComplete(mode: SessionMode): boolean {
  return mode === "action-reward";
}

/**
 * Whether night/day actions or votes cost tokens (action-reward mode).
 */
export function shouldSpendTokensForActions(mode: SessionMode): boolean {
  return mode === "action-reward";
}

/**
 * Whether game phase is driven by session completion (focus-as-night, timed-round).
 */
export function isPhaseDrivenBySession(mode: SessionMode): boolean {
  return mode === "focus-as-night" || mode === "timed-round";
}
