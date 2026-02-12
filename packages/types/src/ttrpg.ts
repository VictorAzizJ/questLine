import type { Player, PlayerId } from "./player";

export type Ruleset = "dnd5e" | "generic";

export type PlayStyle = "campaign" | "one-shot" | "west-marches";

export type EncounterState = "preparing" | "in_combat" | "resolved";

export type InitiativeStatus = "pending" | "active" | "complete";

export interface DndCharacterAbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface DndCharacter {
  id: string;
  playerId: PlayerId;
  name: string;
  className: string;
  level: number;
  armorClass: number;
  hitPoints: number;
  maxHitPoints: number;
  abilityScores: DndCharacterAbilityScores;
  proficiencyBonus: number;
}

export interface InitiativeEntry {
  actorId: string;
  actorName: string;
  initiative: number;
  status: InitiativeStatus;
}

export interface Encounter {
  id: string;
  gameId: string;
  name: string;
  state: EncounterState;
  round: number;
  turnIndex: number;
  initiative: InitiativeEntry[];
  createdAt: number;
  updatedAt: number;
}

export interface DndGameSettings {
  ruleset: Ruleset;
  playStyle: PlayStyle;
  maxPlayers: number;
  allowAiNarration: boolean;
  initiativeMode: "manual" | "auto";
}

export interface DndGameState {
  id: string;
  name: string;
  hostId: string;
  settings: DndGameSettings;
  players: Player[];
  characters: DndCharacter[];
  activeEncounter: Encounter | null;
  createdAt: number;
  updatedAt: number;
}
