// Dice types commonly used in TTRPGs
export type DieType = "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100";

export interface DieRoll {
  die: DieType;
  result: number;
  modifier: number;
  total: number;
}

export interface RollResult {
  notation: string;
  rolls: DieRoll[];
  modifier: number;
  total: number;
  timestamp: number;
}

/**
 * Gets the max value for a die type
 */
export function getDieMax(die: DieType): number {
  switch (die) {
    case "d4":
      return 4;
    case "d6":
      return 6;
    case "d8":
      return 8;
    case "d10":
      return 10;
    case "d12":
      return 12;
    case "d20":
      return 20;
    case "d100":
      return 100;
    default:
      return 6;
  }
}

/**
 * Rolls a single die
 */
export function rollDie(die: DieType): number {
  const max = getDieMax(die);
  return Math.floor(Math.random() * max) + 1;
}

/**
 * Parses dice notation (e.g., "2d6+3", "1d20-2", "3d8")
 */
export function parseNotation(notation: string): {
  count: number;
  die: DieType;
  modifier: number;
} | null {
  const regex = /^(\d+)?d(\d+)([+-]\d+)?$/i;
  const match = notation.trim().match(regex);

  if (!match) return null;

  const count = parseInt(match[1] ?? "1", 10);
  const dieSize = parseInt(match[2], 10);
  const modifier = parseInt(match[3] ?? "0", 10);

  // Validate die size
  const validDice = [4, 6, 8, 10, 12, 20, 100];
  if (!validDice.includes(dieSize)) return null;

  return {
    count,
    die: `d${dieSize}` as DieType,
    modifier,
  };
}

/**
 * Rolls dice based on notation
 */
export function roll(notation: string): RollResult | null {
  const parsed = parseNotation(notation);
  if (!parsed) return null;

  const rolls: DieRoll[] = [];
  let subtotal = 0;

  for (let i = 0; i < parsed.count; i++) {
    const result = rollDie(parsed.die);
    subtotal += result;
    rolls.push({
      die: parsed.die,
      result,
      modifier: 0,
      total: result,
    });
  }

  return {
    notation,
    rolls,
    modifier: parsed.modifier,
    total: subtotal + parsed.modifier,
    timestamp: Date.now(),
  };
}

/**
 * Rolls multiple dice notations at once
 */
export function rollMultiple(notations: string[]): RollResult[] {
  return notations.map((n) => roll(n)).filter((r): r is RollResult => r !== null);
}

/**
 * Checks for a critical (natural 20 on d20)
 */
export function isCritical(result: RollResult): boolean {
  if (result.rolls.length !== 1) return false;
  if (result.rolls[0].die !== "d20") return false;
  return result.rolls[0].result === 20;
}

/**
 * Checks for a critical fail (natural 1 on d20)
 */
export function isCriticalFail(result: RollResult): boolean {
  if (result.rolls.length !== 1) return false;
  if (result.rolls[0].die !== "d20") return false;
  return result.rolls[0].result === 1;
}

/**
 * Formats a roll result for display
 */
export function formatRollResult(result: RollResult): string {
  const rollValues = result.rolls.map((r) => r.result).join(" + ");
  const modifierStr =
    result.modifier !== 0 ? ` ${result.modifier > 0 ? "+" : ""}${result.modifier}` : "";

  if (result.rolls.length === 1 && result.modifier === 0) {
    return `${result.notation}: ${result.total}`;
  }

  return `${result.notation}: [${rollValues}]${modifierStr} = ${result.total}`;
}

/**
 * Gets the average roll for a notation
 */
export function getAverageRoll(notation: string): number | null {
  const parsed = parseNotation(notation);
  if (!parsed) return null;

  const dieAvg = (getDieMax(parsed.die) + 1) / 2;
  return parsed.count * dieAvg + parsed.modifier;
}
