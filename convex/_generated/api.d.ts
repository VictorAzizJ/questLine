/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as aiEngine from "../aiEngine.js";
import type * as auth from "../auth.js";
import type * as games from "../games.js";
import type * as lib_aiDecisions from "../lib/aiDecisions.js";
import type * as lib_aiPrompts from "../lib/aiPrompts.js";
import type * as lib_game from "../lib/game.js";
import type * as lobbies from "../lobbies.js";
import type * as organizationMembers from "../organizationMembers.js";
import type * as organizations from "../organizations.js";
import type * as players from "../players.js";
import type * as realtime from "../realtime.js";
import type * as werewolf_actions from "../werewolf/actions.js";
import type * as werewolf_phases from "../werewolf/phases.js";
import type * as werewolf_voting from "../werewolf/voting.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiEngine: typeof aiEngine;
  auth: typeof auth;
  games: typeof games;
  "lib/aiDecisions": typeof lib_aiDecisions;
  "lib/aiPrompts": typeof lib_aiPrompts;
  "lib/game": typeof lib_game;
  lobbies: typeof lobbies;
  organizationMembers: typeof organizationMembers;
  organizations: typeof organizations;
  players: typeof players;
  realtime: typeof realtime;
  "werewolf/actions": typeof werewolf_actions;
  "werewolf/phases": typeof werewolf_phases;
  "werewolf/voting": typeof werewolf_voting;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
