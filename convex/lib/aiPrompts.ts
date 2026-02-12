/**
 * AI Prompt Templates for questLine Werewolf game.
 *
 * Pure helper functions that build system/user prompts for:
 * - Game narration (phase transitions, eliminations, game start/end)
 * - AI player decisions (night actions per role, voting)
 * - Player hints
 */

// ─── Narration Prompts ───────────────────────────────────────────────

export interface NarrationPromptContext {
  phase: string;
  round: number;
  event: string;
  playerNames: string[];
  aliveCount: number;
  werewolfCount: number;
  eliminatedName?: string;
  protectedName?: string;
  winningTeam?: string;
}

export function buildNarrationSystemPrompt(): string {
  return [
    "You are the Narrator for a Werewolf (Mafia) social-deduction game.",
    "Write atmospheric, immersive narration for game events.",
    "",
    "Rules:",
    '- Write in third person ("The village...", "Dawn breaks...").',
    "- Keep narrations to 2-3 sentences maximum.",
    "- Use a dark, atmospheric medieval-village tone.",
    "- NEVER reveal hidden information (who is a werewolf, etc.).",
    "- Vary descriptions across rounds; avoid repetition.",
    "- Include sensory details: moonlight, shadows, whispers.",
  ].join("\n");
}

export function buildNarrationUserPrompt(ctx: NarrationPromptContext): string {
  const { event, round, aliveCount, eliminatedName, winningTeam } = ctx;

  switch (event) {
    case "game_start":
      return (
        `Narrate the beginning of a new Werewolf game. ` +
        `${aliveCount} villagers have gathered. ` +
        `Among them, werewolves hide in plain sight. Set the scene for the first night.`
      );

    case "night_start":
      return (
        `Narrate the start of Night ${round}. ` +
        `The village falls silent as ${aliveCount} remaining souls retreat to their homes. ` +
        `Darkness descends and the werewolves stir.`
      );

    case "night_end":
      if (eliminatedName) {
        return (
          `Narrate the dawn after Night ${round}. ` +
          `The villagers discover that ${eliminatedName} was killed during the night. ` +
          `${aliveCount} villagers remain.`
        );
      }
      return (
        `Narrate the dawn after Night ${round}. ` +
        `Miraculously, no one was killed. Perhaps the doctor saved someone. ` +
        `${aliveCount} villagers remain.`
      );

    case "day_start":
      return (
        `Narrate the start of Day ${round}. ` +
        `${aliveCount} villagers gather in the town square to discuss suspicions. ` +
        `Accusations fill the air.`
      );

    case "voting_start":
      return (
        `Narrate the start of the voting phase in round ${round}. ` +
        `The villagers must decide who to eliminate. ${aliveCount} players cast their votes.`
      );

    case "elimination":
      return (
        `Narrate the elimination of ${eliminatedName ?? "a villager"} ` +
        `after the village vote in round ${round}. ` +
        `The village has spoken. ${aliveCount} remain.`
      );

    case "no_elimination":
      return (
        `Narrate a tied or failed vote in round ${round}. ` +
        `The village could not agree. No one is removed today. ${aliveCount} remain.`
      );

    case "game_end":
      if (winningTeam === "villagers") {
        return (
          "Narrate the villagers' victory! All werewolves have been eliminated. " +
          "The village is safe once more."
        );
      }
      if (winningTeam === "werewolves") {
        return (
          "Narrate the werewolves' victory! " +
          "The werewolves now outnumber the villagers. Darkness consumes the village."
        );
      }
      return "Narrate the end of the game. The battle between villagers and werewolves has concluded.";

    default:
      return `Narrate a transition in the Werewolf game. Round ${round}, ${aliveCount} players remain.`;
  }
}

// ─── AI Player Decision Prompts ──────────────────────────────────────

export interface AIPlayerPromptContext {
  playerName: string;
  role: string;
  difficulty: "easy" | "medium" | "hard";
  phase: string;
  round: number;
  alivePlayers: Array<{ name: string; id: string }>;
  knownWerewolves?: string[];
  investigationResults?: Array<{ playerName: string; isWerewolf: boolean }>;
  previousEliminations?: string[];
  recentMessages?: string[];
}

const DIFFICULTY_INSTRUCTIONS: Record<string, string> = {
  easy: [
    "You are a beginner player. Make somewhat random decisions.",
    "Occasionally make suboptimal choices.",
    "Don't analyze voting patterns deeply.",
  ].join(" "),
  medium: [
    "You are an average player. Consider basic strategy but sometimes make mistakes.",
    "Pay some attention to voting patterns and behavior.",
  ].join(" "),
  hard: [
    "You are an expert player. Analyze voting patterns, contradictions, and behavioral cues.",
    "Make optimal strategic decisions. Consider meta-game strategies.",
  ].join(" "),
};

export function buildDecisionSystemPrompt(role: string, difficulty: string): string {
  const diff = DIFFICULTY_INSTRUCTIONS[difficulty] ?? DIFFICULTY_INSTRUCTIONS.medium;

  return [
    `You are an AI player in a Werewolf (Mafia) game. Your role is ${role}.`,
    "",
    diff,
    "",
    "IMPORTANT: Respond with ONLY a valid JSON object. No markdown, no explanation outside JSON.",
    'The JSON must have exactly: {"targetId": "<id_or_null>", "reasoning": "<max 100 chars>"}',
  ].join("\n");
}

export function buildNightActionPrompt(ctx: AIPlayerPromptContext): string {
  const { role, alivePlayers, knownWerewolves, investigationResults, playerName, round } = ctx;

  const playerList = alivePlayers
    .filter((p) => p.name !== playerName)
    .map((p) => `  - ${p.name} (ID: ${p.id})`)
    .join("\n");

  switch (role) {
    case "werewolf": {
      const wolfInfo = knownWerewolves?.length
        ? `Your fellow werewolves: ${knownWerewolves.join(", ")}. Do NOT target them.\n`
        : "";
      return [
        `Night ${round}: Choose a player to KILL tonight.`,
        wolfInfo,
        "Alive players you can target:",
        playerList,
        "",
        "Target players who seem influential or who might be special roles.",
        'Respond with JSON: {"targetId": "<player_id>", "reasoning": "<brief>"}',
      ].join("\n");
    }

    case "seer": {
      const priorResults = investigationResults?.length
        ? [
            "Your previous investigations:",
            ...investigationResults.map(
              (r) => `  - ${r.playerName}: ${r.isWerewolf ? "WEREWOLF" : "Not a werewolf"}`
            ),
            "",
          ].join("\n")
        : "";
      return [
        `Night ${round}: Choose a player to INVESTIGATE tonight.`,
        priorResults,
        "Players you can investigate:",
        playerList,
        "",
        "Prioritize players you haven't investigated yet.",
        'Respond with JSON: {"targetId": "<player_id>", "reasoning": "<brief>"}',
      ].join("\n");
    }

    case "doctor": {
      const selfEntry = alivePlayers.find((p) => p.name === playerName);
      const selfLine = selfEntry
        ? `  - ${playerName} (yourself, ID: ${selfEntry.id})`
        : `  - ${playerName} (yourself)`;
      return [
        `Night ${round}: Choose a player to PROTECT tonight.`,
        "You can protect yourself or any other player.",
        "",
        "Players you can protect:",
        selfLine,
        playerList,
        "",
        "Consider protecting high-value targets or yourself if threatened.",
        'Respond with JSON: {"targetId": "<player_id>", "reasoning": "<brief>"}',
      ].join("\n");
    }

    default:
      return [
        `Night ${round}: You have no special night action.`,
        'Respond with: {"targetId": null, "reasoning": "No night action available"}',
      ].join("\n");
  }
}

export function buildVotingPrompt(ctx: AIPlayerPromptContext): string {
  const { alivePlayers, playerName, investigationResults, recentMessages, previousEliminations } =
    ctx;

  const playerList = alivePlayers
    .filter((p) => p.name !== playerName)
    .map((p) => `  - ${p.name} (ID: ${p.id})`)
    .join("\n");

  const sections: string[] = [
    `Round ${ctx.round} Voting: Choose a player to ELIMINATE by vote.`,
    "",
  ];

  if (investigationResults?.length) {
    sections.push("Your investigation results:");
    for (const r of investigationResults) {
      sections.push(`  - ${r.playerName}: ${r.isWerewolf ? "WEREWOLF!" : "Innocent"}`);
    }
    sections.push("");
  }

  if (previousEliminations?.length) {
    sections.push(`Previously eliminated: ${previousEliminations.join(", ")}`);
    sections.push("");
  }

  if (recentMessages?.length) {
    sections.push("Recent discussion:");
    for (const m of recentMessages.slice(-5)) {
      sections.push(`  ${m}`);
    }
    sections.push("");
  }

  sections.push("Players you can vote for:");
  sections.push(playerList);
  sections.push("");

  if (ctx.role === "werewolf") {
    sections.push(
      "STRATEGY: As a werewolf, deflect suspicion. " +
        "Vote for villagers, especially those close to identifying werewolves."
    );
  } else {
    sections.push(
      "STRATEGY: Vote for the player you find most suspicious based on behavior and evidence."
    );
  }

  sections.push("");
  sections.push("You can abstain by setting targetId to null.");
  sections.push('Respond with JSON: {"targetId": "<player_id_or_null>", "reasoning": "<brief>"}');

  return sections.join("\n");
}

// ─── Hint Prompts ────────────────────────────────────────────────────

export function buildHintSystemPrompt(): string {
  return [
    "You are a helpful game assistant for Werewolf (Mafia).",
    "Provide strategic hints to help players. Keep hints to 1-2 sentences.",
    "Never reveal other players' roles or private information.",
  ].join(" ");
}

export function buildHintUserPrompt(ctx: {
  role: string;
  phase: string;
  round: number;
  aliveCount: number;
}): string {
  return (
    `The player is a ${ctx.role} in the ${ctx.phase} phase of round ${ctx.round}. ` +
    `There are ${ctx.aliveCount} players alive. ` +
    `Give them a helpful strategy hint for their current situation.`
  );
}

// ─── Pre-written Fallback Narrations ─────────────────────────────────

/**
 * Pre-written narrations used when OpenRouter is unavailable.
 * Keyed by event type, with template variables for dynamic content.
 */
export function getFallbackNarration(
  event: string,
  context: { round?: number; eliminatedName?: string; winningTeam?: string }
): string {
  const { round, eliminatedName, winningTeam } = context;

  const narrations: Record<string, string> = {
    game_start:
      "A hush falls over the village as darkness creeps in. " +
      "Among the innocent faces gathered around the fire, predators lurk unseen. " +
      "The first night approaches.",

    night_start:
      `Night ${round ?? ""} descends upon the village. ` +
      "Doors are barred, candles extinguished. " +
      "In the shadows, the werewolves begin their hunt.",

    night_end: eliminatedName
      ? `Dawn breaks to reveal a terrible sight. ${eliminatedName} has been found lifeless ` +
        "at their doorstep. The village mourns, and fear tightens its grip."
      : "The sun rises on an untouched village. By luck or providence, " +
        "no one was taken in the night. But suspicion still festers.",

    day_start:
      `Day ${round ?? ""} begins. The surviving villagers gather in the square, ` +
      "eyes darting with suspicion. Someone among them wears a mask of innocence " +
      "over a wolf's heart.",

    voting_start:
      "The time for talk is over. The village must now decide who to cast out. " +
      "Each voice carries the weight of life and death.",

    elimination: eliminatedName
      ? `The village has spoken. ${eliminatedName} is led to the edge of the village, ` +
        "condemned by the majority. Whether justice or tragedy, only time will tell."
      : "The vote concludes, but the village remains divided. No one is eliminated today.",

    no_elimination:
      "Voices clash and accusations fly, but no consensus is reached. " +
      "The village will face another night with the wolves still among them.",

    game_end:
      winningTeam === "villagers"
        ? "At last, the final werewolf is unmasked! The village erupts in relief. " +
          "The nightmare is over, and the survivors embrace under a clear sky."
        : "The howling grows louder as the last villagers fall. " +
          "The werewolves have claimed the village as their own. Darkness reigns supreme.",
  };

  return narrations[event] ?? "The game unfolds as tensions rise in the village.";
}

/** Pre-written hints for fallback when OpenRouter is unavailable. */
export const FALLBACK_HINTS: string[] = [
  "Pay attention to voting patterns - werewolves often vote together to protect each other.",
  "The Seer should be cautious about revealing too much too early.",
  "If you're the Doctor, try to predict who the werewolves will target tonight.",
  "Watch for players who are unusually quiet - they might be hiding something.",
  "Werewolves benefit from chaos. If someone is creating confusion, they might have a reason.",
  "Keep track of who accuses whom. Wolves sometimes accuse confirmed innocents.",
];
