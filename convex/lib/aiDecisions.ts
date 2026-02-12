/**
 * AI Decision Parsing and Fallback Logic.
 *
 * Pure helper functions that:
 * - Parse structured decisions from AI text responses
 * - Validate target IDs against alive players
 * - Provide deterministic fallback decisions per role / difficulty
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface ParsedDecision {
  targetId: string | null;
  reasoning: string;
}

// ─── Response Parsing ────────────────────────────────────────────────

/**
 * Attempt to extract a structured {targetId, reasoning} from an AI text
 * response. Returns `null` when parsing fails entirely.
 */
export function parseAIDecision(response: string): ParsedDecision | null {
  try {
    const cleaned = response.trim();

    // 1. Try to locate a JSON object in the response
    const jsonMatch = cleaned.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      const rawTarget = parsed.targetId ?? parsed.target_id ?? parsed.target ?? null;
      const targetId =
        rawTarget === "null" || rawTarget === "" ? null : (rawTarget as string | null);

      return {
        targetId: typeof targetId === "string" ? targetId : null,
        reasoning: String(
          parsed.reasoning ?? parsed.reason ?? parsed.explanation ?? "No reasoning provided"
        ),
      };
    }
  } catch {
    // JSON extraction failed; fall through to heuristic
  }

  // 2. Heuristic: look for an ID-like token after common keywords
  const idMatch = response.match(
    /(?:target|choose|select|vote\s+for|kill|investigate|protect)[:\s]+([a-z0-9]{10,})/i
  );
  if (idMatch && idMatch[1]) {
    return {
      targetId: idMatch[1],
      reasoning: "Extracted from unstructured AI response",
    };
  }

  return null;
}

// ─── Validation ──────────────────────────────────────────────────────

/** Return `targetId` if it appears in `validIds`, otherwise `null`. */
export function validateTargetId(targetId: string | null, validIds: string[]): string | null {
  if (targetId === null) return null;
  return validIds.includes(targetId) ? targetId : null;
}

// ─── Fallback Decision Engine ────────────────────────────────────────

export interface FallbackOptions {
  difficulty: "easy" | "medium" | "hard";
  knownWerewolves?: string[];
  investigationResults?: Array<{ playerId: string; isWerewolf: boolean }>;
  selfId?: string;
}

/**
 * Produce a deterministic (or lightly-randomised) decision when the AI
 * model is unavailable or returns an unparseable response.
 */
export function fallbackDecision(
  role: string,
  phase: string,
  candidates: Array<{ id: string; name: string }>,
  options: FallbackOptions
): ParsedDecision {
  if (candidates.length === 0) {
    return { targetId: null, reasoning: "No valid targets available" };
  }

  // Filter out allies for werewolves
  let targets = [...candidates];
  if (role === "werewolf" && options.knownWerewolves?.length) {
    const wolves = new Set(options.knownWerewolves);
    const filtered = targets.filter((c) => !wolves.has(c.id));
    if (filtered.length > 0) targets = filtered;
  }

  // ── Seer / voting: if we know a werewolf, target them ──
  if ((phase === "voting" || phase === "day") && options.investigationResults?.length) {
    const knownWolf = options.investigationResults.find((r) => r.isWerewolf);
    if (knownWolf) {
      const wolfTarget = targets.find((t) => t.id === knownWolf.playerId);
      if (wolfTarget) {
        return {
          targetId: wolfTarget.id,
          reasoning: "Targeting a confirmed werewolf from investigation",
        };
      }
    }
  }

  // ── Doctor self-protection ──
  if (role === "doctor" && phase === "night" && options.selfId) {
    const selfChance =
      options.difficulty === "easy" ? 0.3 : options.difficulty === "medium" ? 0.2 : 0.1;
    if (Math.random() < selfChance) {
      return {
        targetId: options.selfId,
        reasoning: "Self-protection for safety",
      };
    }
  }

  // ── Difficulty-based selection ──
  return selectByDifficulty(targets, options);
}

function selectByDifficulty(
  targets: Array<{ id: string; name: string }>,
  options: FallbackOptions
): ParsedDecision {
  switch (options.difficulty) {
    case "easy": {
      const idx = Math.floor(Math.random() * targets.length);
      return {
        targetId: targets[idx].id,
        reasoning: "Random selection (easy difficulty fallback)",
      };
    }

    case "medium": {
      // Slight bias towards the first half of the list (some strategy)
      const halfIdx = Math.max(Math.floor(targets.length / 2), 1);
      const pool = targets.slice(0, halfIdx);
      const idx = Math.floor(Math.random() * pool.length);
      return {
        targetId: pool[idx].id,
        reasoning: "Semi-strategic selection (medium difficulty fallback)",
      };
    }

    case "hard": {
      // Prefer uninvestigated players when investigation data exists
      if (options.investigationResults?.length) {
        const investigated = new Set(options.investigationResults.map((r) => r.playerId));
        const uninvestigated = targets.filter((t) => !investigated.has(t.id));
        if (uninvestigated.length > 0) {
          return {
            targetId: uninvestigated[0].id,
            reasoning: "Strategic: targeting uninvestigated player (hard fallback)",
          };
        }
      }
      return {
        targetId: targets[0].id,
        reasoning: "Strategic selection (hard difficulty fallback)",
      };
    }

    default: {
      const idx = Math.floor(Math.random() * targets.length);
      return {
        targetId: targets[idx].id,
        reasoning: "Fallback selection",
      };
    }
  }
}
