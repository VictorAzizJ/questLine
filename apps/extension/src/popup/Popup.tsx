import React, { useEffect, useMemo, useState } from "react";
import { ConvexProvider, ConvexReactClient, useMutation, useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import type { BackgroundSnapshot, TimerKind } from "../shared/protocol";
import { sendBackground } from "./background";

type TabId = "timer" | "game" | "settings";

function formatTime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function classNames(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

function Pill({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={classNames(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function TimerPanel({
  snapshot,
  onRefresh,
}: {
  snapshot: BackgroundSnapshot;
  onRefresh: () => Promise<void>;
}) {
  const timer = snapshot.timer;

  async function startPause() {
    await sendBackground({ type: timer.isRunning ? "TIMER_PAUSE" : "TIMER_START" });
    await onRefresh();
  }

  async function reset(kind: TimerKind) {
    await sendBackground({ type: "TIMER_RESET", kind });
    await onRefresh();
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mb-2 font-mono text-5xl font-bold">
          {formatTime(timer.remainingSeconds)}
        </div>
        <div className="text-sm uppercase tracking-wide text-slate-400">
          {timer.kind === "focus" ? "Focus" : "Break"} {timer.isRunning ? "running" : "paused"}
        </div>
        {snapshot.gameSync?.phase ? (
          <div className="mt-2 text-xs text-slate-400">
            Game phase: <span className="text-slate-200">{snapshot.gameSync.phase}</span>
          </div>
        ) : null}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          className="flex-1 rounded-lg bg-purple-600 px-4 py-2 font-medium transition-colors hover:bg-purple-700"
          onClick={startPause}
          type="button"
        >
          {timer.isRunning ? "Pause" : "Start"}
        </button>
        <button
          className="rounded-lg bg-slate-700 px-4 py-2 font-medium transition-colors hover:bg-slate-600"
          onClick={() => reset(timer.kind)}
          type="button"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          className={classNames(
            "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            timer.kind === "focus"
              ? "bg-slate-800 text-white"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
          )}
          onClick={() => reset("focus")}
          type="button"
        >
          Focus
        </button>
        <button
          className={classNames(
            "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            timer.kind === "break"
              ? "bg-slate-800 text-white"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
          )}
          onClick={() => reset("break")}
          type="button"
        >
          Break
        </button>
      </div>
    </div>
  );
}

function SettingsPanel({
  snapshot,
  onRefresh,
}: {
  snapshot: BackgroundSnapshot;
  onRefresh: () => Promise<void>;
}) {
  const [convexUrl, setConvexUrl] = useState(snapshot.settings.convexUrl ?? "");
  const [webAppUrl, setWebAppUrl] = useState(
    snapshot.settings.webAppUrl ?? "https://questline.app"
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setConvexUrl(snapshot.settings.convexUrl ?? "");
    setWebAppUrl(snapshot.settings.webAppUrl ?? "https://questline.app");
  }, [snapshot.settings.convexUrl, snapshot.settings.webAppUrl]);

  async function save() {
    setStatus("saving");
    try {
      await sendBackground({
        type: "SETTINGS_SET",
        settings: {
          convexUrl: convexUrl.trim() || undefined,
          webAppUrl: webAppUrl.trim() || undefined,
        },
      });
      await onRefresh();
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 900);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-300">
          Convex deployment URL
        </label>
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
          placeholder="https://your-deployment.convex.cloud"
          value={convexUrl}
          onChange={(e) => setConvexUrl(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">Used by popup + background sync.</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-300">Web app URL</label>
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
          placeholder="https://questline.app"
          value={webAppUrl}
          onChange={(e) => setWebAppUrl(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          onClick={save}
          type="button"
        >
          Save
        </button>
        <button
          className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-900"
          onClick={() => void sendBackground({ type: "OPEN_WEB_APP" })}
          type="button"
        >
          Open web app
        </button>
        <div className="text-xs text-slate-500">
          {status === "saving"
            ? "Saving…"
            : status === "saved"
              ? "Saved"
              : status === "error"
                ? "Error"
                : null}
        </div>
      </div>
    </div>
  );
}

function JoinGamePanel({
  convexUrl,
  onContextSet,
}: {
  convexUrl: string;
  onContextSet: (ctx: { gameId: string; playerId: string }) => Promise<void>;
}) {
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const lobby = useQuery(
    api.lobbies.getLobbyByInviteCode,
    inviteCode.trim() ? { inviteCode: inviteCode.trim() } : "skip"
  );
  const join = useMutation(api.players.join);

  async function doJoin() {
    setError(null);
    if (!lobby) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a display name.");
      return;
    }
    try {
      const playerId = await join({
        gameId: lobby.game._id,
        userId: undefined,
        name: trimmed,
        avatarUrl: undefined,
        isAI: false,
        aiDifficulty: undefined,
      });
      await onContextSet({
        gameId: lobby.game._id as unknown as string,
        playerId: playerId as unknown as string,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join game.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
        Convex: <span className="text-slate-200">{convexUrl}</span>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-300">Invite code</label>
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
          placeholder="ABC123"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-300">Display name</label>
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
          placeholder="Victo"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {inviteCode.trim() ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          {lobby === undefined ? (
            <div className="text-sm text-slate-300">Looking up lobby…</div>
          ) : lobby === null ? (
            <div className="text-sm text-slate-300">No lobby found for that invite code.</div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-white">{lobby.game.name}</div>
              <div className="text-xs text-slate-400">
                {lobby.players.length}/{lobby.capacity} players
              </div>
              <button
                className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
                onClick={doJoin}
                type="button"
              >
                Join
              </button>
            </div>
          )}
        </div>
      ) : null}

      {error ? <div className="text-sm text-red-400">{error}</div> : null}
    </div>
  );
}

function GameRoomPanel({
  context,
  onLeave,
}: {
  context: { gameId: string; playerId: string };
  onLeave: () => Promise<void>;
}) {
  const gameId = context.gameId as unknown as Id<"games">;
  const playerId = context.playerId as unknown as Id<"players">;

  const state = useQuery(api.realtime.gameState, { gameId });
  const sendChat = useMutation(api.realtime.sendChatMessage);
  const castVote = useMutation(api.werewolf.voting.castVote);
  const submitNightAction = useMutation(api.werewolf.actions.submitNightAction);
  const startGame = useMutation(api.games.start);
  const advancePhase = useMutation(api.werewolf.phases.advancePhase);
  const tallyVotes = useMutation(api.werewolf.voting.tallyVotes);
  const resolveNight = useMutation(api.werewolf.actions.resolveNightActions);
  const leaveGame = useMutation(api.players.leave);

  const [chat, setChat] = useState("");
  const [voteTarget, setVoteTarget] = useState<Id<"players"> | "">("");
  type NightActionType = "kill" | "protect" | "investigate" | "none";
  const [nightActionType, setNightActionType] = useState<NightActionType>("none");
  const [nightTarget, setNightTarget] = useState<Id<"players"> | "">("");
  const [error, setError] = useState<string | null>(null);

  const me = state?.players.find((p) => p._id === playerId);
  const alivePlayers = (state?.players ?? []).filter((p) => p.isAlive);

  async function doSendChat() {
    setError(null);
    const trimmed = chat.trim();
    if (!trimmed || !state) return;
    try {
      await sendChat({ gameId, senderId: playerId, content: trimmed });
      setChat("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message.");
    }
  }

  async function doVote() {
    setError(null);
    if (!state) return;
    try {
      await castVote({
        gameId,
        voterId: playerId,
        targetId: voteTarget === "" ? undefined : voteTarget,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cast vote.");
    }
  }

  async function doNightAction() {
    setError(null);
    if (!state) return;
    try {
      await submitNightAction({
        gameId,
        playerId,
        actionType: nightActionType,
        targetId: nightTarget === "" ? undefined : nightTarget,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit night action.");
    }
  }

  async function doLeave() {
    setError(null);
    try {
      await leaveGame({ playerId });
    } catch {
      // Ignore server errors; still allow local leave.
    }
    await onLeave();
  }

  if (!state) {
    return <div className="text-sm text-slate-300">Loading game…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-white">{state.game.name}</div>
            <div className="mt-1 text-xs text-slate-400">
              Phase: <span className="text-slate-200">{state.game.phase}</span> · Round{" "}
              <span className="text-slate-200">{state.game.round}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              You: <span className="text-slate-200">{me?.name ?? context.playerId}</span>
              {me?.role ? (
                <>
                  {" "}
                  · Role: <span className="text-slate-200">{me.role}</span>
                </>
              ) : null}
            </div>
          </div>
          <button
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
            onClick={doLeave}
            type="button"
          >
            Leave
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
        <div className="mb-2 text-xs font-medium text-slate-300">Players</div>
        <div className="grid grid-cols-2 gap-2">
          {state.players.map((p) => (
            <div
              key={p._id}
              className={classNames(
                "rounded-lg px-2 py-1 text-xs",
                p.isAlive
                  ? "bg-slate-900 text-slate-200"
                  : "bg-slate-950 text-slate-500 line-through"
              )}
            >
              {p.name}
            </div>
          ))}
        </div>
      </div>

      {state.game.phase === "night" ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          <div className="mb-2 text-xs font-medium text-slate-300">Night action</div>
          <div className="grid grid-cols-2 gap-2">
            <select
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
              value={nightActionType}
              onChange={(e) => setNightActionType(e.target.value as NightActionType)}
            >
              <option value="none">None</option>
              <option value="kill">Kill</option>
              <option value="protect">Protect</option>
              <option value="investigate">Investigate</option>
            </select>
            <select
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
              value={nightTarget}
              onChange={(e) => setNightTarget((e.target.value || "") as Id<"players"> | "")}
            >
              <option value="">No target</option>
              {alivePlayers
                .filter((p) => p._id !== playerId)
                .map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <button
            className="mt-2 w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            onClick={doNightAction}
            type="button"
          >
            Submit action
          </button>
        </div>
      ) : null}

      {state.game.phase === "day" || state.game.phase === "voting" ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          <div className="mb-2 text-xs font-medium text-slate-300">Vote</div>
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
            value={voteTarget}
            onChange={(e) => setVoteTarget((e.target.value || "") as Id<"players"> | "")}
          >
            <option value="">Abstain</option>
            {alivePlayers
              .filter((p) => p._id !== playerId)
              .map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
          </select>
          <button
            className="mt-2 w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            onClick={doVote}
            type="button"
          >
            Cast vote
          </button>
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
        <div className="mb-2 text-xs font-medium text-slate-300">Chat</div>
        <div className="max-h-40 space-y-1 overflow-auto rounded-lg bg-slate-900 p-2 text-xs text-slate-200">
          {state.messages.length === 0 ? (
            <div className="text-slate-500">No messages yet.</div>
          ) : null}
          {state.messages.map((m) => (
            <div key={m._id}>
              <span className="text-slate-400">{m.senderId === playerId ? "You" : "Player"}:</span>{" "}
              {m.content}
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
            placeholder="Message…"
            value={chat}
            onChange={(e) => setChat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void doSendChat();
            }}
          />
          <button
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            onClick={doSendChat}
            type="button"
          >
            Send
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          onClick={async () => {
            setError(null);
            try {
              await startGame({ gameId });
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to start game.");
            }
          }}
          type="button"
        >
          Start
        </button>
        <button
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          onClick={async () => {
            setError(null);
            try {
              await advancePhase({ gameId });
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to advance phase.");
            }
          }}
          type="button"
        >
          Advance
        </button>
        <button
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          onClick={async () => {
            setError(null);
            try {
              await resolveNight({ gameId });
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to resolve night.");
            }
          }}
          type="button"
        >
          Resolve night
        </button>
        <button
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          onClick={async () => {
            setError(null);
            try {
              await tallyVotes({ gameId });
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to tally votes.");
            }
          }}
          type="button"
        >
          Tally votes
        </button>
      </div>

      {error ? <div className="text-sm text-red-400">{error}</div> : null}
    </div>
  );
}

function GamePanel({
  snapshot,
  onRefresh,
}: {
  snapshot: BackgroundSnapshot;
  onRefresh: () => Promise<void>;
}) {
  const convexUrl = snapshot.settings.convexUrl;
  const context = snapshot.context;

  const convexClient = useMemo(() => {
    if (!convexUrl) return null;
    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  async function setContext(next: { gameId: string; playerId: string }) {
    await sendBackground({ type: "CONTEXT_SET", gameId: next.gameId, playerId: next.playerId });
    await onRefresh();
  }

  async function clearContext() {
    await sendBackground({ type: "CONTEXT_SET", gameId: undefined, playerId: undefined });
    await onRefresh();
  }

  if (!convexClient || !convexUrl) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
        Add your Convex deployment URL in <span className="text-white">Settings</span> to join a
        game.
      </div>
    );
  }

  const hasContext = !!context.gameId && !!context.playerId;

  return (
    <ConvexProvider client={convexClient}>
      {!hasContext ? (
        <JoinGamePanel convexUrl={convexUrl} onContextSet={setContext} />
      ) : (
        <GameRoomPanel
          context={{ gameId: context.gameId as string, playerId: context.playerId as string }}
          onLeave={clearContext}
        />
      )}
    </ConvexProvider>
  );
}

export function Popup() {
  const [tab, setTab] = useState<TabId>("timer");
  const [snapshot, setSnapshot] = useState<BackgroundSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [_tick, setTick] = useState(0);

  async function refresh() {
    const res = await sendBackground({ type: "GET_SNAPSHOT" });
    if (!res.ok || !res.snapshot) {
      setConnected(false);
      return;
    }
    setConnected(true);
    setSnapshot(res.snapshot);
  }

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      setTick((t) => t + 1);
      void refresh();
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (!snapshot) {
    return (
      <div className="w-80 bg-slate-900 p-4 text-white">
        <div className="mb-2 text-sm text-slate-300">Loading…</div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-slate-900 p-4 text-white">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          quest<span className="text-purple-500">Line</span>
        </h1>
        <div
          className={classNames("h-2 w-2 rounded-full", connected ? "bg-green-500" : "bg-red-500")}
          title={connected ? "Connected" : "Disconnected"}
        />
      </div>

      <div className="mb-4 flex gap-2">
        <Pill active={tab === "timer"} onClick={() => setTab("timer")}>
          Timer
        </Pill>
        <Pill active={tab === "game"} onClick={() => setTab("game")}>
          Game
        </Pill>
        <Pill active={tab === "settings"} onClick={() => setTab("settings")}>
          Settings
        </Pill>
      </div>

      {tab === "timer" ? <TimerPanel snapshot={snapshot} onRefresh={refresh} /> : null}
      {tab === "game" ? <GamePanel snapshot={snapshot} onRefresh={refresh} /> : null}
      {tab === "settings" ? <SettingsPanel snapshot={snapshot} onRefresh={refresh} /> : null}

      <div className="mt-4 border-t border-slate-800 pt-3 text-center text-xs text-slate-500">
        <button
          className="hover:text-purple-400"
          onClick={() => void sendBackground({ type: "OPEN_WEB_APP" })}
          type="button"
        >
          Open web app →
        </button>
      </div>
    </div>
  );
}
