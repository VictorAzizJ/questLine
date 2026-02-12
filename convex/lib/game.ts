import { v } from "convex/values";

export const sessionModeValidator = v.union(
  v.literal("focus-as-night"),
  v.literal("action-reward"),
  v.literal("timed-round")
);

export const aiDifficultyValidator = v.union(
  v.literal("easy"),
  v.literal("medium"),
  v.literal("hard")
);

export const gameStatusValidator = v.union(
  v.literal("waiting"),
  v.literal("starting"),
  v.literal("in_progress"),
  v.literal("ended")
);

export const gamePhaseValidator = v.union(
  v.literal("setup"),
  v.literal("night"),
  v.literal("day"),
  v.literal("voting"),
  v.literal("resolution"),
  v.literal("ended")
);

export const gameTypeValidator = v.union(v.literal("werewolf"), v.literal("generic_ttrpg"));

export const roleValidator = v.union(
  v.literal("villager"),
  v.literal("werewolf"),
  v.literal("seer"),
  v.literal("doctor"),
  v.literal("hunter")
);

export const winnerValidator = v.union(
  v.literal("villagers"),
  v.literal("werewolves"),
  v.literal("none")
);

export const gameSettingsValidator = v.object({
  playerCount: v.number(),
  werewolfCount: v.number(),
  includeRoles: v.array(v.string()),
  aiPlayerCount: v.number(),
  aiDifficulty: aiDifficultyValidator,
  focusDuration: v.number(),
  breakDuration: v.number(),
  allowChat: v.boolean(),
  revealRolesOnDeath: v.boolean(),
});

export const actionTypeValidator = v.union(
  v.literal("kill"),
  v.literal("investigate"),
  v.literal("protect"),
  v.literal("none")
);

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
