// Background service worker for questLine extension (MV3).
//
// Responsibilities:
// - Pomodoro timer (durable via storage)
// - Notifications on timer completion
// - Badge updates (countdown + pending game actions)
// - Lightweight background sync against Convex (HTTP polling)

import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import type {
  BackgroundRequest,
  BackgroundResponse,
  BackgroundSnapshot,
  ExtensionSettings,
  GameContext,
  TimerKind,
  TimerPersistedState,
} from "../shared/protocol";
import { storageGet, storageSet } from "../shared/storage";

const STORAGE_TIMER_KEY = "questline.timer";
const STORAGE_CONTEXT_KEY = "questline.context";
const STORAGE_SETTINGS_KEY = "questline.settings";
const STORAGE_GAME_SYNC_KEY = "questline.gameSync";

const ALARM_TIMER_FINISH = "questline.timer.finish";
const ALARM_BADGE_TICK = "questline.badge.tick";
const ALARM_GAME_SYNC = "questline.game.sync";

const DEFAULT_FOCUS_SECONDS = 25 * 60;
const DEFAULT_BREAK_SECONDS = 5 * 60;

const BADGE_COLORS = {
  focus: "#9333ea", // Purple
  break: "#22c55e", // Green
  idle: "#64748b", // Slate
  pending: "#ef4444", // Red
};

function alarmsClear(name: string) {
  return new Promise<void>((resolve) => {
    chrome.alarms.clear(name, () => resolve());
  });
}

function notificationsCreate(options: chrome.notifications.NotificationOptions<true>) {
  return new Promise<string>((resolve, reject) => {
    chrome.notifications.create(options, (id) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve(id);
    });
  });
}

function tabsCreate(options: chrome.tabs.CreateProperties) {
  return new Promise<chrome.tabs.Tab>((resolve, reject) => {
    chrome.tabs.create(options, (tab) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve(tab);
    });
  });
}

function nowMs() {
  return Date.now();
}

function clampInt(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.floor(value), min), max);
}

function computeRemainingSeconds(state: TimerPersistedState, atMs = nowMs()) {
  if (!state.isRunning) {
    return clampInt(state.remainingSeconds, 0, state.durationSeconds);
  }
  const endAt = state.endAtMs;
  if (!endAt) {
    return clampInt(state.remainingSeconds, 0, state.durationSeconds);
  }
  return clampInt(Math.ceil((endAt - atMs) / 1000), 0, state.durationSeconds);
}

async function getTimer(): Promise<TimerPersistedState> {
  return (
    (await storageGet<TimerPersistedState>(STORAGE_TIMER_KEY)) ?? {
      kind: "focus",
      isRunning: false,
      durationSeconds: DEFAULT_FOCUS_SECONDS,
      remainingSeconds: DEFAULT_FOCUS_SECONDS,
    }
  );
}

async function setTimer(next: TimerPersistedState) {
  await storageSet(STORAGE_TIMER_KEY, next);
}

async function getContext(): Promise<GameContext> {
  return (await storageGet<GameContext>(STORAGE_CONTEXT_KEY)) ?? {};
}

async function setContext(next: GameContext) {
  await storageSet(STORAGE_CONTEXT_KEY, next);
}

async function getSettings(): Promise<ExtensionSettings> {
  return (
    (await storageGet<ExtensionSettings>(STORAGE_SETTINGS_KEY)) ?? {
      webAppUrl: "https://questline.app",
    }
  );
}

async function setSettings(next: ExtensionSettings) {
  await storageSet(STORAGE_SETTINGS_KEY, next);
}

type GameSyncState = BackgroundSnapshot["gameSync"];

async function setGameSync(next: GameSyncState) {
  await storageSet(STORAGE_GAME_SYNC_KEY, next);
}

async function getGameSync(): Promise<GameSyncState> {
  return (await storageGet<GameSyncState>(STORAGE_GAME_SYNC_KEY)) ?? undefined;
}

async function scheduleAlarmsForTimer(timer: TimerPersistedState) {
  await alarmsClear(ALARM_TIMER_FINISH);
  await alarmsClear(ALARM_BADGE_TICK);

  if (!timer.isRunning || !timer.endAtMs) {
    return;
  }

  chrome.alarms.create(ALARM_TIMER_FINISH, { when: timer.endAtMs });
  chrome.alarms.create(ALARM_BADGE_TICK, { periodInMinutes: 1 }); // reliable minimum
}

async function ensureGameSyncAlarm() {
  // Always keep a lightweight poller alive; if no context/settings are set it no-ops.
  chrome.alarms.create(ALARM_GAME_SYNC, { periodInMinutes: 1 });
}

async function updateBadge() {
  const [timer, gameSync] = await Promise.all([getTimer(), getGameSync()]);
  const remaining = computeRemainingSeconds(timer);

  const hasPending = (gameSync?.pendingAction ?? false) || (gameSync?.pendingVote ?? false);

  const badgeText = timer.isRunning
    ? `${Math.max(1, Math.ceil(remaining / 60))}`
    : hasPending
      ? "!"
      : "";

  const badgeColor = timer.isRunning
    ? BADGE_COLORS[timer.kind]
    : hasPending
      ? BADGE_COLORS.pending
      : BADGE_COLORS.idle;

  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: badgeColor });
}

async function notify(title: string, message: string) {
  // A tiny 1x1 transparent PNG as data URL. Avoids bundling binary icon assets.
  const iconUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ax7r0cAAAAASUVORK5CYII=";
  try {
    await notificationsCreate({
      type: "basic",
      iconUrl,
      title,
      message,
    });
  } catch (err) {
    // Notification failures shouldn't break the timer.
    console.warn("Notification failed", err);
  }
}

async function timerStart() {
  const timer = await getTimer();
  if (timer.isRunning) return;

  const at = nowMs();
  const remaining = clampInt(timer.remainingSeconds, 1, timer.durationSeconds);
  const next: TimerPersistedState = {
    ...timer,
    isRunning: true,
    remainingSeconds: remaining,
    startedAtMs: at,
    endAtMs: at + remaining * 1000,
  };
  await setTimer(next);
  await scheduleAlarmsForTimer(next);
  await updateBadge();
}

async function timerPause() {
  const timer = await getTimer();
  if (!timer.isRunning) return;
  const remaining = computeRemainingSeconds(timer);
  const next: TimerPersistedState = {
    ...timer,
    isRunning: false,
    remainingSeconds: remaining,
    startedAtMs: undefined,
    endAtMs: undefined,
  };
  await setTimer(next);
  await scheduleAlarmsForTimer(next);
  await updateBadge();
}

async function timerReset(kind?: TimerKind, durationSeconds?: number) {
  const current = await getTimer();
  const nextKind = kind ?? current.kind;
  const defaultDuration = nextKind === "focus" ? DEFAULT_FOCUS_SECONDS : DEFAULT_BREAK_SECONDS;
  const nextDuration = clampInt(durationSeconds ?? defaultDuration, 5, 24 * 60 * 60);

  const next: TimerPersistedState = {
    kind: nextKind,
    isRunning: false,
    durationSeconds: nextDuration,
    remainingSeconds: nextDuration,
    startedAtMs: undefined,
    endAtMs: undefined,
  };
  await setTimer(next);
  await scheduleAlarmsForTimer(next);
  await updateBadge();
}

async function onTimerFinished() {
  const timer = await getTimer();
  // If we woke up late, recompute remaining and only finish if it's actually done.
  const remaining = computeRemainingSeconds(timer);
  if (!timer.isRunning || remaining > 0) {
    await updateBadge();
    return;
  }

  await timerPause();
  if (timer.kind === "focus") {
    await notify("Focus complete", "Great work — time for a break.");
    await maybeAwardFocusToken();
    await timerReset("break", DEFAULT_BREAK_SECONDS);
  } else {
    await notify("Break over", "Ready to focus again?");
    await timerReset("focus", DEFAULT_FOCUS_SECONDS);
  }
}

async function maybeAwardFocusToken() {
  const [settings, context] = await Promise.all([getSettings(), getContext()]);
  if (!settings.convexUrl || !context.playerId) return;

  try {
    const client = new ConvexHttpClient(settings.convexUrl);
    await client.mutation(api.players.awardTokens, {
      playerId: context.playerId as Id<"players">,
      amount: 1,
    });
  } catch (err) {
    console.warn("Failed to award token", err);
  }
}

async function gameSyncPoll() {
  const [settings, context] = await Promise.all([getSettings(), getContext()]);
  if (!settings.convexUrl || !context.gameId || !context.playerId) {
    await setGameSync(undefined);
    await updateBadge();
    return;
  }

  try {
    const client = new ConvexHttpClient(settings.convexUrl);
    const state = await client.query(api.realtime.gameState, {
      gameId: context.gameId as Id<"games">,
    });
    if (!state) {
      await setGameSync({ error: "Game not found", lastCheckedAtMs: nowMs() });
      await updateBadge();
      return;
    }

    const playerId = context.playerId as Id<"players">;
    const me = state.players.find((p) => p._id === playerId);
    const phase = state.game.phase;
    const pendingAction = !!me && me.isAlive && phase === "night" && me.hasActedThisRound === false;
    const pendingVote =
      !!me &&
      me.isAlive &&
      (phase === "day" || phase === "voting") &&
      me.hasVotedThisRound === false;

    await setGameSync({
      phase,
      pendingAction,
      pendingVote,
      lastCheckedAtMs: nowMs(),
    });
    await updateBadge();
  } catch (err) {
    await setGameSync({
      error: err instanceof Error ? err.message : "Game sync failed",
      lastCheckedAtMs: nowMs(),
    });
    await updateBadge();
  }
}

async function snapshot(): Promise<BackgroundSnapshot> {
  const [timer, context, settings, gameSync] = await Promise.all([
    getTimer(),
    getContext(),
    getSettings(),
    getGameSync(),
  ]);

  const remainingSeconds = computeRemainingSeconds(timer);
  return {
    timer: {
      kind: timer.kind,
      isRunning: timer.isRunning,
      remainingSeconds,
      durationSeconds: timer.durationSeconds,
      startedAtMs: timer.startedAtMs,
      endAtMs: timer.endAtMs,
    },
    context,
    settings,
    gameSync,
  };
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureGameSyncAlarm();
  void updateBadge();
});

chrome.runtime.onStartup?.addListener(async () => {
  await ensureGameSyncAlarm();
  void updateBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_TIMER_FINISH) void onTimerFinished();
  if (alarm.name === ALARM_BADGE_TICK) void updateBadge();
  if (alarm.name === ALARM_GAME_SYNC) void gameSyncPoll();
});

chrome.runtime.onMessage.addListener((message: BackgroundRequest, _sender, sendResponse) => {
  (async (): Promise<BackgroundResponse> => {
    switch (message.type) {
      case "GET_SNAPSHOT": {
        return { ok: true, snapshot: await snapshot() };
      }
      case "TIMER_START": {
        await timerStart();
        return { ok: true, snapshot: await snapshot() };
      }
      case "TIMER_PAUSE": {
        await timerPause();
        return { ok: true, snapshot: await snapshot() };
      }
      case "TIMER_RESET": {
        await timerReset(message.kind, message.durationSeconds);
        return { ok: true, snapshot: await snapshot() };
      }
      case "CONTEXT_SET": {
        await setContext({ gameId: message.gameId, playerId: message.playerId });
        void gameSyncPoll();
        return { ok: true, snapshot: await snapshot() };
      }
      case "SETTINGS_SET": {
        const current = await getSettings();
        await setSettings({ ...current, ...message.settings });
        void gameSyncPoll();
        return { ok: true, snapshot: await snapshot() };
      }
      case "OPEN_WEB_APP": {
        const settings = await getSettings();
        const url = settings.webAppUrl ?? "https://questline.app";
        await tabsCreate({ url });
        return { ok: true };
      }
      default: {
        return { ok: false, error: "Unknown message type" };
      }
    }
  })()
    .then(sendResponse)
    .catch((err) => {
      sendResponse({ ok: false, error: err instanceof Error ? err.message : "Unknown error" });
    });
  return true;
});
