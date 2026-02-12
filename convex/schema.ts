import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { gameTypeValidator } from "./lib/game";

export default defineSchema({
  // Users table
  users: defineTable({
    email: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    stats: v.object({
      gamesPlayed: v.number(),
      gamesWon: v.number(),
      totalFocusMinutes: v.number(),
      focusSessionsCompleted: v.number(),
      tokensEarned: v.number(),
      tokensSpent: v.number(),
    }),
    preferences: v.object({
      theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
      soundEnabled: v.boolean(),
      notificationsEnabled: v.boolean(),
      defaultFocusDuration: v.number(),
      defaultBreakDuration: v.number(),
    }),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Games table
  games: defineTable({
    name: v.string(),
    hostId: v.id("users"),
    organizationId: v.optional(v.id("organizations")),
    inviteCode: v.string(),
    gameType: v.optional(gameTypeValidator),
    mode: v.union(
      v.literal("focus-as-night"),
      v.literal("action-reward"),
      v.literal("timed-round")
    ),
    status: v.union(
      v.literal("waiting"),
      v.literal("starting"),
      v.literal("in_progress"),
      v.literal("ended")
    ),
    phase: v.union(
      v.literal("setup"),
      v.literal("night"),
      v.literal("day"),
      v.literal("voting"),
      v.literal("resolution"),
      v.literal("ended")
    ),
    round: v.number(),
    settings: v.object({
      playerCount: v.number(),
      werewolfCount: v.number(),
      includeRoles: v.array(v.string()),
      aiPlayerCount: v.number(),
      aiDifficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
      focusDuration: v.number(),
      breakDuration: v.number(),
      allowChat: v.boolean(),
      revealRolesOnDeath: v.boolean(),
    }),
    winner: v.optional(v.union(v.literal("villagers"), v.literal("werewolves"), v.literal("none"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_invite_code", ["inviteCode"])
    .index("by_status", ["status"])
    .index("by_host", ["hostId"])
    .index("by_organization", ["organizationId"])
    .index("by_org_and_status", ["organizationId", "status"]),

  // Players table
  players: defineTable({
    gameId: v.id("games"),
    userId: v.optional(v.id("users")), // null for AI players
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("villager"),
        v.literal("werewolf"),
        v.literal("seer"),
        v.literal("doctor"),
        v.literal("hunter")
      )
    ),
    isAlive: v.boolean(),
    isAI: v.boolean(),
    aiDifficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
    actionTokens: v.number(),
    hasActedThisRound: v.boolean(),
    hasVotedThisRound: v.boolean(),
    isConnected: v.boolean(),
    joinedAt: v.number(),
    lastActiveAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_user", ["userId"])
    .index("by_game_and_user", ["gameId", "userId"]),

  // Sessions table (focus sessions)
  sessions: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    type: v.union(v.literal("focus"), v.literal("break"), v.literal("planning")),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    durationMinutes: v.number(),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    pausedAt: v.optional(v.number()),
    elapsedSeconds: v.number(),
    completedCycles: v.number(),
    tokensEarned: v.number(),
    createdAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_player", ["playerId"])
    .index("by_status", ["status"]),

  // Night actions table
  actions: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    targetId: v.optional(v.id("players")),
    actionType: v.union(
      v.literal("kill"),
      v.literal("investigate"),
      v.literal("protect"),
      v.literal("none")
    ),
    round: v.number(),
    timestamp: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_game_and_round", ["gameId", "round"])
    .index("by_player", ["playerId"]),

  // Votes table
  votes: defineTable({
    gameId: v.id("games"),
    voterId: v.id("players"),
    targetId: v.optional(v.id("players")), // null for abstain
    round: v.number(),
    timestamp: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_game_and_round", ["gameId", "round"])
    .index("by_voter", ["voterId"]),

  // Messages table (game chat)
  messages: defineTable({
    gameId: v.id("games"),
    senderId: v.optional(v.id("players")), // null for system messages
    content: v.string(),
    type: v.union(
      v.literal("chat"),
      v.literal("system"),
      v.literal("narration"),
      v.literal("whisper")
    ),
    visibility: v.union(
      v.literal("all"),
      v.literal("werewolves"),
      v.literal("dead"),
      v.literal("private")
    ),
    recipientId: v.optional(v.id("players")), // for private messages
    timestamp: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_game_and_visibility", ["gameId", "visibility"]),

  // AI tasks queue for narration and bot decisions
  aiTasks: defineTable({
    gameId: v.id("games"),
    playerId: v.optional(v.id("players")),
    taskType: v.union(v.literal("narration"), v.literal("player_decision"), v.literal("hint")),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    model: v.string(),
    payload: v.any(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_game", ["gameId"])
    .index("by_status", ["status"])
    .index("by_game_and_status", ["gameId", "status"]),

  // Event stream for game state subscriptions
  gameEvents: defineTable({
    gameId: v.id("games"),
    type: v.string(),
    payload: v.any(),
    round: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_game_and_time", ["gameId", "createdAt"]),

  // Organizations table
  organizations: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    settings: v.object({
      allowPublicGames: v.boolean(),
      defaultGameMode: v.string(),
      maxPlayersPerGame: v.number(),
      aiPlayersAllowed: v.boolean(),
    }),
    memberCount: v.number(),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  // Organization members table
  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_and_user", ["organizationId", "userId"]),
});
