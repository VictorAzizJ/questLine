import type { Encounter, InitiativeEntry } from "@questline/types";

export interface StartEncounterInput {
  gameId: string;
  name: string;
  participants: Array<{
    actorId: string;
    actorName: string;
    initiative: number;
  }>;
}

export function createEncounter(input: StartEncounterInput): Encounter {
  const now = Date.now();
  const sortedInitiative: InitiativeEntry[] = [...input.participants]
    .sort((a, b) => b.initiative - a.initiative)
    .map((participant) => ({
      actorId: participant.actorId,
      actorName: participant.actorName,
      initiative: participant.initiative,
      status: "pending",
    }));

  return {
    id: generateId(),
    gameId: input.gameId,
    name: input.name,
    state: "in_combat",
    round: 1,
    turnIndex: 0,
    initiative: sortedInitiative,
    createdAt: now,
    updatedAt: now,
  };
}

export function getCurrentTurn(encounter: Encounter): InitiativeEntry | null {
  if (encounter.initiative.length === 0) {
    return null;
  }
  return encounter.initiative[encounter.turnIndex] ?? null;
}

export function advanceTurn(encounter: Encounter): Encounter {
  if (encounter.initiative.length === 0) {
    return encounter;
  }

  const nextTurnIndex = (encounter.turnIndex + 1) % encounter.initiative.length;
  const didWrapRound = nextTurnIndex === 0;

  return {
    ...encounter,
    round: didWrapRound ? encounter.round + 1 : encounter.round,
    turnIndex: nextTurnIndex,
    initiative: encounter.initiative.map((entry, index) => ({
      ...entry,
      status: index === nextTurnIndex ? "active" : "pending",
    })),
    updatedAt: Date.now(),
  };
}

export function resolveEncounter(encounter: Encounter): Encounter {
  return {
    ...encounter,
    state: "resolved",
    updatedAt: Date.now(),
    initiative: encounter.initiative.map((entry) => ({ ...entry, status: "complete" })),
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
