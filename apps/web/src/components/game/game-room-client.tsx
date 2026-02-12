"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@questline/ui";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSessionUser } from "@/lib/auth-session";

const PHASE_COPY: Record<string, string> = {
  setup: "Players are joining and preparing.",
  night: "Night phase: role abilities are active.",
  day: "Day phase: discuss clues and accuse suspects.",
  voting: "Voting phase: cast your vote to eliminate.",
  resolution: "Resolution phase: results are being processed.",
  ended: "Game ended: review outcomes and roles.",
};

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

type GameRoomClientProps = {
  gameId: string;
};

export function GameRoomClient({ gameId }: GameRoomClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionUser, isHydrated } = useSessionUser();
  const [selectedVoteTarget, setSelectedVoteTarget] = useState<string>("");
  const [selectedActionTarget, setSelectedActionTarget] = useState<string>("");
  const [chatDraft, setChatDraft] = useState("");
  const [actionError, setActionError] = useState("");
  const [chatError, setChatError] = useState("");
  const [isCastingVote, setIsCastingVote] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isAdvancingPhase, setIsAdvancingPhase] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const gameState = useQuery(api.realtime.gameState, { gameId: gameId as Id<"games"> });
  const castVote = useMutation(api.werewolf.voting.castVote);
  const submitNightAction = useMutation(api.werewolf.actions.submitNightAction);
  const advancePhase = useMutation(api.werewolf.phases.advancePhase);
  const startGame = useMutation(api.games.start);
  const sendChatMessage = useMutation(api.realtime.sendChatMessage);
  const joinGame = useMutation(api.players.join);

  useEffect(() => {
    if (isHydrated && !sessionUser) {
      router.push("/login");
    }
  }, [isHydrated, sessionUser, router]);

  const playerIdFromQuery = searchParams.get("playerId");
  const currentPlayer = useMemo(() => {
    if (!gameState?.players) {
      return null;
    }

    if (playerIdFromQuery) {
      return gameState.players.find((player) => player._id === playerIdFromQuery) ?? null;
    }

    if (!sessionUser) {
      return null;
    }

    return gameState.players.find((player) => player.userId === sessionUser.userId) ?? null;
  }, [gameState?.players, playerIdFromQuery, sessionUser]);

  const alivePlayers = useMemo(
    () => gameState?.players?.filter((player) => player.isAlive) ?? [],
    [gameState?.players]
  );

  const isHost = useMemo(
    () => Boolean(sessionUser && gameState?.game?.hostId === sessionUser.userId),
    [sessionUser, gameState?.game?.hostId]
  );

  const voteCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vote of gameState?.roundVotes ?? []) {
      if (!vote.targetId) {
        continue;
      }
      counts.set(vote.targetId, (counts.get(vote.targetId) ?? 0) + 1);
    }
    return counts;
  }, [gameState?.roundVotes]);

  const currentVote = useMemo(
    () => gameState?.roundVotes?.find((vote) => vote.voterId === currentPlayer?._id),
    [gameState?.roundVotes, currentPlayer?._id]
  );

  const currentAction = useMemo(
    () => gameState?.roundActions?.find((action) => action.playerId === currentPlayer?._id),
    [gameState?.roundActions, currentPlayer?._id]
  );

  const actionTypeForRole = useMemo(() => {
    switch (currentPlayer?.role) {
      case "werewolf":
        return "kill" as const;
      case "seer":
        return "investigate" as const;
      case "doctor":
        return "protect" as const;
      default:
        return "none" as const;
    }
  }, [currentPlayer?.role]);

  const visibleMessages = useMemo(() => {
    if (!gameState?.messages) {
      return [];
    }
    return gameState.messages.filter((message) => {
      if (!currentPlayer) {
        return message.visibility === "all" && message.type !== "whisper";
      }

      if (message.visibility === "all") {
        return true;
      }
      if (message.visibility === "werewolves") {
        return currentPlayer.role === "werewolf";
      }
      if (message.visibility === "dead") {
        return !currentPlayer.isAlive;
      }
      if (message.visibility === "private") {
        return message.recipientId === currentPlayer._id || message.senderId === currentPlayer._id;
      }
      return false;
    });
  }, [gameState?.messages, currentPlayer]);

  const currentVoteTargetName = useMemo(() => {
    if (!currentVote?.targetId) {
      return "Abstain";
    }
    return (
      gameState?.players.find((player) => player._id === currentVote.targetId)?.name ??
      "Unknown player"
    );
  }, [currentVote?.targetId, gameState?.players]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages.length]);

  async function handleJoinCurrentGame() {
    if (!gameState?.game || !sessionUser) {
      return;
    }
    setActionError("");
    setIsJoiningGame(true);
    try {
      const playerId = await joinGame({
        gameId: gameState.game._id,
        userId: sessionUser.userId as Id<"users">,
        name: sessionUser.displayName,
        avatarUrl: sessionUser.avatarUrl,
        isAI: false,
      });
      router.replace(`/game/${gameState.game._id}?playerId=${playerId}`);
    } catch (joinError) {
      setActionError(joinError instanceof Error ? joinError.message : "Could not join this game.");
    } finally {
      setIsJoiningGame(false);
    }
  }

  async function handleCastVote() {
    if (!gameState?.game || !currentPlayer) {
      return;
    }
    setActionError("");
    setIsCastingVote(true);

    try {
      await castVote({
        gameId: gameState.game._id,
        voterId: currentPlayer._id,
        targetId: selectedVoteTarget ? (selectedVoteTarget as Id<"players">) : undefined,
      });
    } catch (voteError) {
      setActionError(voteError instanceof Error ? voteError.message : "Could not cast vote.");
    } finally {
      setIsCastingVote(false);
    }
  }

  async function handleSubmitNightAction() {
    if (!gameState?.game || !currentPlayer) {
      return;
    }
    setActionError("");
    setIsSubmittingAction(true);

    try {
      await submitNightAction({
        gameId: gameState.game._id,
        playerId: currentPlayer._id,
        targetId: selectedActionTarget ? (selectedActionTarget as Id<"players">) : undefined,
        actionType: actionTypeForRole,
      });
    } catch (nightError) {
      setActionError(
        nightError instanceof Error ? nightError.message : "Could not submit night action."
      );
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleAdvancePhase() {
    if (!gameState?.game) {
      return;
    }
    setActionError("");
    setIsAdvancingPhase(true);
    try {
      await advancePhase({ gameId: gameState.game._id });
    } catch (phaseError) {
      setActionError(phaseError instanceof Error ? phaseError.message : "Could not advance phase.");
    } finally {
      setIsAdvancingPhase(false);
    }
  }

  async function handleStartGame() {
    if (!gameState?.game) {
      return;
    }
    setActionError("");
    setIsStartingGame(true);
    try {
      await startGame({ gameId: gameState.game._id });
    } catch (startError) {
      setActionError(startError instanceof Error ? startError.message : "Could not start game.");
    } finally {
      setIsStartingGame(false);
    }
  }

  async function handleSendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gameState?.game || !currentPlayer) {
      return;
    }
    setChatError("");
    setIsSendingChat(true);
    try {
      await sendChatMessage({
        gameId: gameState.game._id,
        senderId: currentPlayer._id,
        content: chatDraft,
      });
      setChatDraft("");
    } catch (sendError) {
      setChatError(sendError instanceof Error ? sendError.message : "Could not send message.");
    } finally {
      setIsSendingChat(false);
    }
  }

  if (!isHydrated || !sessionUser) {
    return (
      <main className="container mx-auto flex min-h-screen items-center justify-center px-4">
        <p className="text-muted-foreground">Loading game room...</p>
      </main>
    );
  }

  if (gameState === undefined) {
    return (
      <main className="container mx-auto flex min-h-screen items-center justify-center px-4">
        <p className="text-muted-foreground">Connecting to lobby...</p>
      </main>
    );
  }

  if (!gameState?.game) {
    return (
      <main className="container mx-auto flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Game not found</CardTitle>
            <CardDescription>This game may have been deleted or never existed.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/lobby")}>
              Back to lobbies
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto space-y-6 px-4 py-6">
      <header className="fantasy-panel grid gap-4 rounded-lg p-4 lg:grid-cols-3 lg:items-center">
        <div>
          <h1 className="text-2xl font-bold">{gameState.game.name}</h1>
          <p className="text-muted-foreground text-sm">Invite code: {gameState.game.inviteCode}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{gameState.game.status}</Badge>
          <Badge variant="secondary">{gameState.game.phase}</Badge>
          <Badge variant="outline">Round {gameState.game.round}</Badge>
        </div>
        <div className="flex gap-2 lg:justify-end">
          <Button variant="outline" onClick={() => router.push("/lobby")}>
            Back to lobbies
          </Button>
          {isHost && gameState.game.status === "waiting" ? (
            <Button onClick={handleStartGame} disabled={isStartingGame}>
              {isStartingGame ? "Starting..." : "Start game"}
            </Button>
          ) : null}
        </div>
      </header>

      {!currentPlayer ? (
        <Card className="fantasy-panel">
          <CardHeader>
            <CardTitle>Join This Game</CardTitle>
            <CardDescription>
              You are authenticated but not currently a player in this room. Join to vote, act, and
              chat.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              Players: {gameState.players.length}/{gameState.game.settings.playerCount}
            </p>
            <Button
              onClick={handleJoinCurrentGame}
              disabled={isJoiningGame || gameState.game.status !== "waiting"}
            >
              {isJoiningGame
                ? "Joining..."
                : gameState.game.status !== "waiting"
                  ? "Game already started"
                  : "Join game"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-12">
        <Card className="fantasy-panel order-2 xl:order-1 xl:col-span-8">
          <CardHeader>
            <CardTitle>Game Room</CardTitle>
            <CardDescription>
              {PHASE_COPY[gameState.game.phase] ?? "Track players and phase actions."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {gameState.players.map((player) => {
                const votes = voteCounts.get(player._id) ?? 0;
                return (
                  <article
                    key={player._id}
                    className="border-border/80 bg-secondary/20 rounded-md border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{player.name}</p>
                      <Badge variant={player.isAlive ? "secondary" : "destructive"}>
                        {player.isAlive ? "Alive" : "Eliminated"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {player.isAI ? "AI player" : "Human player"}
                    </p>
                    {player._id === currentPlayer?._id ? (
                      <p className="text-primary mt-2 text-xs font-medium">You</p>
                    ) : null}
                    {(gameState.game.status === "ended" ||
                      (gameState.game.settings.revealRolesOnDeath && !player.isAlive) ||
                      player._id === currentPlayer?._id) &&
                    player.role ? (
                      <p className="text-muted-foreground mt-1 text-xs uppercase tracking-wide">
                        {player.role}
                      </p>
                    ) : null}
                    {votes > 0 ? (
                      <p className="text-muted-foreground mt-2 text-xs">{votes} vote(s)</p>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-border/80 bg-background/35">
                <CardHeader>
                  <CardTitle className="text-lg">Voting</CardTitle>
                  <CardDescription>
                    Day/voting phases allow one vote per alive player each round.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <select
                    value={selectedVoteTarget}
                    onChange={(event) => setSelectedVoteTarget(event.target.value)}
                    className="fantasy-input w-full"
                    disabled={!currentPlayer?.isAlive}
                  >
                    <option value="">Abstain</option>
                    {alivePlayers
                      .filter((player) => player._id !== currentPlayer?._id)
                      .map((player) => (
                        <option key={player._id} value={player._id}>
                          {player.name}
                        </option>
                      ))}
                  </select>
                  <Button
                    onClick={handleCastVote}
                    className="w-full"
                    disabled={
                      !currentPlayer ||
                      !currentPlayer.isAlive ||
                      (gameState.game.phase !== "day" && gameState.game.phase !== "voting") ||
                      isCastingVote
                    }
                  >
                    {isCastingVote ? "Submitting vote..." : "Cast vote"}
                  </Button>
                  {currentVote ? (
                    <p className="text-muted-foreground text-xs">
                      Current vote: {currentVoteTargetName}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-background/35">
                <CardHeader>
                  <CardTitle className="text-lg">Night Action</CardTitle>
                  <CardDescription>
                    Submit your role action during night. If your role has no ability, this stays
                    disabled.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <select
                    value={selectedActionTarget}
                    onChange={(event) => setSelectedActionTarget(event.target.value)}
                    className="fantasy-input w-full"
                    disabled={!currentPlayer?.isAlive}
                  >
                    <option value="">No target</option>
                    {alivePlayers
                      .filter((player) => player._id !== currentPlayer?._id)
                      .map((player) => (
                        <option key={player._id} value={player._id}>
                          {player.name}
                        </option>
                      ))}
                  </select>
                  <Button
                    onClick={handleSubmitNightAction}
                    className="w-full"
                    disabled={
                      !currentPlayer ||
                      !currentPlayer.isAlive ||
                      gameState.game.phase !== "night" ||
                      actionTypeForRole === "none" ||
                      isSubmittingAction
                    }
                  >
                    {isSubmittingAction ? "Submitting action..." : "Submit action"}
                  </Button>
                  {currentAction ? (
                    <p className="text-muted-foreground text-xs">Action ready for this round.</p>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap gap-2">
              {isHost ? (
                <Button onClick={handleAdvancePhase} disabled={isAdvancingPhase}>
                  {isAdvancingPhase ? "Advancing..." : "Advance phase"}
                </Button>
              ) : null}
              {!currentPlayer ? (
                <p className="text-muted-foreground text-sm">
                  Join this game to interact with actions and voting.
                </p>
              ) : null}
              {actionError ? <p className="text-destructive text-sm">{actionError}</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card className="fantasy-panel order-1 xl:order-2 xl:col-span-4">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>
              Real-time chat with visibility rules per phase and role.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-[60vh] flex-col gap-3 xl:h-[72vh]">
            <div className="border-border/80 bg-background/45 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-md border p-3">
              {visibleMessages.map((message) => {
                const sender = message.senderId
                  ? (gameState.players.find((player) => player._id === message.senderId)?.name ??
                    "Unknown")
                  : message.type === "narration"
                    ? "Narrator"
                    : "System";

                return (
                  <article key={message._id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{sender}</p>
                      <span className="text-muted-foreground text-xs">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                  </article>
                );
              })}
              {visibleMessages.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No messages yet. Start the conversation.
                </p>
              ) : null}
              <div ref={chatEndRef} />
            </div>

            <form className="space-y-2 border-t pt-2" onSubmit={handleSendChat}>
              <textarea
                value={chatDraft}
                onChange={(event) => setChatDraft(event.target.value)}
                placeholder="Type a message..."
                className="fantasy-input min-h-16 w-full"
                maxLength={500}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">{chatDraft.length}/500</p>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={!currentPlayer || isSendingChat}
                >
                  {isSendingChat ? "Sending..." : "Send message"}
                </Button>
              </div>
              {chatError ? <p className="text-destructive text-sm">{chatError}</p> : null}
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
