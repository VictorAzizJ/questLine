# Codex / AI code review configuration

This file configures [OpenAI Codex](https://developers.openai.com/codex) and other AI-assisted code review tools for the questLine monorepo.

## Project context

- **questLine** is a Turborepo monorepo: TTRPG-powered focus and collaborative play (Werewolf + Pomodoro, Convex backend, Next.js + Chrome extension).
- **Apps**: `apps/web` (Next.js 14), `apps/extension` (Chrome).
- **Packages**: `packages/types`, `packages/game-logic`, `packages/ui`. Shared code is used by both web and extension.
- **Backend**: Convex (schema, auth, games, players). TypeScript throughout.

## Code quality before review

Run the full check before requesting or interpreting Codex review:

```bash
npm run check
```

This runs (in order):

1. **Format** – `npm run format:check` (Prettier)
2. **Lint** – `npm run lint` (ESLint via Turbo in all workspaces)
3. **Types** – `npm run type-check` (TypeScript `tsc --noEmit` via Turbo)

Fix any failures so the baseline is clean; then use Codex for higher-level feedback (design, security, readability, edge cases).

## Using Codex for code review

- **Web**: [chatgpt.com/codex/code-review](https://chatgpt.com/codex/code-review)
- **CLI / GitHub**: See [OpenAI Codex documentation](https://developers.openai.com/codex) for CLI and GitHub Action setup.
- **Scope**: Prefer reviewing one app or package at a time (e.g. `convex/`, `packages/game-logic/`, `apps/web/`) and mention this file so the model uses the context above.

## Conventions

- TypeScript strict mode; shared types in `@questline/types`.
- ESLint + Prettier; Husky + lint-staged on commit.
- Convex: use the generated API and schema types from `convex/_generated`.
