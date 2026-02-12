"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { clearSessionUser, useSessionUser } from "@/lib/auth-session";

type SessionMode = "focus-as-night" | "action-reward" | "timed-round";
type AIDifficulty = "easy" | "medium" | "hard";

const MODE_LABELS: Record<SessionMode, string> = {
  "focus-as-night": "Scene Focus Rhythm",
  "action-reward": "Milestone Reward Loop",
  "timed-round": "Timed Encounter Rounds",
};

export default function LobbyPage() {
  const router = useRouter();
  const { sessionUser, isHydrated } = useSessionUser();
  const listPublicLobbies = useQuery(api.lobbies.listPublicLobbies, { limit: 30 });
  const createGame = useMutation(api.games.create);
  const joinGame = useMutation(api.players.join);

  const [gameName, setGameName] = useState("The Ashen Keep");
  const [mode, setMode] = useState<SessionMode>("focus-as-night");
  const [playerCount, setPlayerCount] = useState(8);
  const [aiPlayerCount, setAiPlayerCount] = useState(2);
  const [inviteCode, setInviteCode] = useState("");
  const [formError, setFormError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);
  const [joinLoadingGameId, setJoinLoadingGameId] = useState<string | null>(null);

  const normalizedInviteCode = inviteCode.trim().toUpperCase();
  const inviteLobby = useQuery(
    api.lobbies.getLobbyByInviteCode,
    normalizedInviteCode ? { inviteCode: normalizedInviteCode } : "skip"
  );

  useEffect(() => {
    if (isHydrated && !sessionUser) {
      router.push("/login");
    }
  }, [isHydrated, sessionUser, router]);

  const createDisabled = useMemo(() => !sessionUser || isCreating, [isCreating, sessionUser]);

  async function handleCreateGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionUser) {
      return;
    }

    setFormError("");
    if (!gameName.trim()) {
      setFormError("Game name is required.");
      return;
    }
    if (aiPlayerCount > playerCount - 1) {
      setFormError("AI count must leave at least one human slot.");
      return;
    }

    const werewolfCount = Math.max(1, Math.floor(playerCount / 4));
    const settings = {
      playerCount,
      werewolfCount,
      includeRoles: ["villager", "werewolf", "seer", "doctor", "hunter"],
      aiPlayerCount,
      aiDifficulty: "medium" as AIDifficulty,
      focusDuration: 25,
      breakDuration: 5,
      allowChat: true,
      revealRolesOnDeath: true,
    };

    setIsCreating(true);
    try {
      const { gameId } = await createGame({
        name: gameName.trim(),
        hostId: sessionUser.userId as Id<"users">,
        mode,
        settings,
      });

      const playerId = await joinGame({
        gameId,
        userId: sessionUser.userId as Id<"users">,
        name: sessionUser.displayName,
        avatarUrl: sessionUser.avatarUrl,
        isAI: false,
      });

      router.push(`/game/${gameId}?playerId=${playerId}`);
    } catch (createError) {
      setFormError(createError instanceof Error ? createError.message : "Could not create game.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinGame(gameId: Id<"games">) {
    if (!sessionUser) {
      return;
    }

    setJoinError("");
    setJoinLoadingGameId(gameId);
    try {
      const playerId = await joinGame({
        gameId,
        userId: sessionUser.userId as Id<"users">,
        name: sessionUser.displayName,
        avatarUrl: sessionUser.avatarUrl,
        isAI: false,
      });
      router.push(`/game/${gameId}?playerId=${playerId}`);
    } catch (joinGameError) {
      setJoinError(
        joinGameError instanceof Error ? joinGameError.message : "Could not join lobby."
      );
    } finally {
      setJoinLoadingGameId(null);
    }
  }

  async function handleJoinByInvite() {
    if (!sessionUser) {
      return;
    }
    setJoinError("");
    if (!normalizedInviteCode) {
      setJoinError("Enter an invite code.");
      return;
    }
    if (!inviteLobby?.game?._id) {
      setJoinError("No lobby found for that invite code.");
      return;
    }

    setIsJoiningByCode(true);
    try {
      const playerId = await joinGame({
        gameId: inviteLobby.game._id,
        userId: sessionUser.userId as Id<"users">,
        name: sessionUser.displayName,
        avatarUrl: sessionUser.avatarUrl,
        isAI: false,
      });
      router.push(`/game/${inviteLobby.game._id}?playerId=${playerId}`);
    } catch (joinByCodeError) {
      setJoinError(
        joinByCodeError instanceof Error ? joinByCodeError.message : "Could not join via code."
      );
    } finally {
      setIsJoiningByCode(false);
    }
  }

  if (!isHydrated || !sessionUser) {
    return (
      <main className="container mx-auto flex min-h-screen items-center justify-center px-4">
        <p className="text-muted-foreground">Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto space-y-8 px-4 py-8">
      <header className="fantasy-panel flex flex-col gap-4 rounded-lg p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Signed in as</p>
          <h1 className="text-2xl font-bold">{sessionUser.displayName}</h1>
          <p className="text-muted-foreground text-sm">{sessionUser.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              clearSessionUser();
              router.push("/login");
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="fantasy-panel">
          <CardHeader>
            <CardTitle>Create Campaign Room</CardTitle>
            <CardDescription>
              Host a web-first D&D/TTRPG table with party size and pacing controls.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreateGame}>
              <div className="space-y-2">
                <label htmlFor="gameName" className="text-sm font-medium">
                  Campaign name
                </label>
                <input
                  id="gameName"
                  value={gameName}
                  onChange={(event) => setGameName(event.target.value)}
                  className="fantasy-input w-full"
                  placeholder="The Ashen Keep"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="mode" className="text-sm font-medium">
                    Session pacing
                  </label>
                  <select
                    id="mode"
                    value={mode}
                    onChange={(event) => setMode(event.target.value as SessionMode)}
                    className="fantasy-input w-full"
                  >
                    <option value="focus-as-night">Focus-as-Night</option>
                    <option value="action-reward">Action-Reward</option>
                    <option value="timed-round">Timed-Round</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="playerCount" className="text-sm font-medium">
                    Party slots
                  </label>
                  <input
                    id="playerCount"
                    type="number"
                    value={playerCount}
                    min={4}
                    max={15}
                    onChange={(event) => setPlayerCount(Number(event.target.value))}
                    className="fantasy-input w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="aiPlayerCount" className="text-sm font-medium">
                  AI companions
                </label>
                <input
                  id="aiPlayerCount"
                  type="number"
                  value={aiPlayerCount}
                  min={0}
                  max={Math.max(0, playerCount - 1)}
                  onChange={(event) => setAiPlayerCount(Number(event.target.value))}
                  className="fantasy-input w-full"
                />
              </div>

              {formError ? <p className="text-destructive text-sm">{formError}</p> : null}
              <Button type="submit" disabled={createDisabled} className="w-full">
                {isCreating ? "Creating room..." : "Create and join"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="fantasy-panel">
          <CardHeader>
            <CardTitle>Join Campaign by Invite Code</CardTitle>
            <CardDescription>Enter a 6-character code from your host.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="inviteCode" className="text-sm font-medium">
                Invite code
              </label>
              <input
                id="inviteCode"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                maxLength={8}
                className="fantasy-input w-full uppercase tracking-widest"
                placeholder="ABC123"
              />
            </div>
            {normalizedInviteCode && inviteLobby?.game ? (
              <div className="border-border/80 bg-secondary/30 rounded-md border p-3">
                <p className="font-medium">{inviteLobby.game.name}</p>
                <p className="text-muted-foreground text-sm">
                  {inviteLobby.players.length}/{inviteLobby.capacity} players
                </p>
              </div>
            ) : null}
            {normalizedInviteCode && inviteLobby === null ? (
              <p className="text-muted-foreground text-sm">No lobby found for this code yet.</p>
            ) : null}
            <Button onClick={handleJoinByInvite} className="w-full" disabled={isJoiningByCode}>
              {isJoiningByCode ? "Joining..." : "Join campaign"}
            </Button>
            {joinError ? <p className="text-destructive text-sm">{joinError}</p> : null}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Public Campaign Rooms</h2>
          <p className="text-muted-foreground text-sm">
            {listPublicLobbies === undefined ? "Loading..." : `${listPublicLobbies.length} active`}
          </p>
        </div>

        {listPublicLobbies === undefined ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-muted-foreground text-center text-sm">
                Loading available campaign rooms...
              </p>
            </CardContent>
          </Card>
        ) : null}
        {listPublicLobbies && listPublicLobbies.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-muted-foreground text-center text-sm">
                No public campaign rooms are waiting right now. Create one to get started.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listPublicLobbies?.map((lobby) => (
            <Card key={lobby._id} className="fantasy-panel">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{lobby.name}</CardTitle>
                  <Badge variant="secondary">
                    {MODE_LABELS[lobby.mode as SessionMode] ?? lobby.mode}
                  </Badge>
                </div>
                <CardDescription>Invite: {lobby.inviteCode}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground text-sm">
                  <p>
                    Players: {lobby.currentPlayers}/{lobby.settings.playerCount}
                  </p>
                  <p>Phase: {lobby.phase}</p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleJoinGame(lobby._id)}
                  disabled={joinLoadingGameId === lobby._id || lobby.availableSpots <= 0}
                >
                  {joinLoadingGameId === lobby._id
                    ? "Joining..."
                    : lobby.availableSpots <= 0
                      ? "Room full"
                      : "Join campaign"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
