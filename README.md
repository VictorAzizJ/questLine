# questLine

🎲 TTRPG-powered focus, collaboration, and play

Questline is a web-based TTRPG platform focused first on generic D&D-style gameplay in-browser,
with optional AI assistance and collaborative table tools.

## Architecture

```
questLine/
├── apps/
│   ├── web/                    # Next.js 14 web application
│   │   ├── src/
│   │   │   ├── app/            # App router pages
│   │   │   └── components/     # React components
│   │   └── ...
│   │
│   └── extension/              # Chrome extension (deferred track)
│       ├── src/
│       │   ├── popup/          # Extension popup UI
│       │   └── background/     # Service worker
│       └── manifest.json
│
├── packages/
│   ├── types/                  # Shared TypeScript types
│   │   └── src/
│   │       ├── ttrpg.ts        # Generic D&D/TTRPG game types
│   │       ├── werewolf.ts     # Werewolf game types (deferred track)
│   │       ├── session.ts      # Focus session types
│   │       ├── player.ts       # Player/user types
│   │       └── ai.ts           # AI integration types
│   │
│   ├── game-logic/             # Shared game mechanics
│   │   └── src/
│   │       ├── ttrpg/          # Generic turn/encounter helpers
│   │       ├── werewolf/       # Werewolf rules engine (deferred track)
│   │       ├── pomodoro/       # Timer and session logic
│   │       └── dice/           # Dice rolling
│   │
│   └── ui/                     # Shared UI components
│       └── src/
│           └── components/     # Button, Card, Timer, etc.
│
├── convex/                     # Convex backend
│   ├── schema.ts               # Database schema
│   ├── auth.ts                 # Authentication
│   ├── games.ts                # Game CRUD
│   └── players.ts              # Player management
│
└── turbo.json                  # Turborepo configuration
```

## Tech Stack

| Layer    | Technology           | Purpose                  |
| -------- | -------------------- | ------------------------ |
| Monorepo | Turborepo            | Shared code, fast builds |
| Frontend | Next.js 14           | Web application          |
| Backend  | Convex               | Real-time database       |
| Auth     | Convex Auth          | Native authentication    |
| AI       | OpenRouter           | Model flexibility        |
| Styling  | Tailwind + shadcn/ui | UI components            |
| State    | Convex + Zustand     | Server + client state    |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+
- Convex account

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/questLine.git
cd questLine

# Install dependencies
npm install

# Set up environment variables
cp apps/web/.env.local.example apps/web/.env.local
# Edit .env.local with your Convex URL
```

### Development

```bash
# Start all apps in development mode
npm run dev

# Or start specific apps
cd apps/web && npm run dev
```

### Convex Setup

```bash
# Login to Convex
npx convex login

# Initialize Convex (first time only)
npx convex dev --once

# Start Convex dev server
npx convex dev
```

## Scope Priority

### 1. Web-first D&D/TTRPG Campaign Play (Current MVP)

Generic tabletop gameplay in the browser is the primary build target.

- Real-time campaign rooms with invite codes
- Shared dice tooling (d20 and multi-die notation)
- Encounter/turn flow primitives in shared game logic
- Chat and session coordination for remote/async tables
- AI assistance for narration and DM support

### 2. Focus Quest (Secondary)

Productivity mechanics remain available as optional support systems.

- Solo or team focus sessions
- Pomodoro-powered timers
- Token rewards for completing sessions
- Can be integrated with campaign pacing where useful

### 3. Werewolf + Extension (Deferred)

Werewolf social deduction and extension-first experiences are intentionally deferred until the web
TTRPG MVP is stable.

## Project Structure

### Packages

- **@questline/types**: Shared TypeScript definitions
- **@questline/game-logic**: Game rules and mechanics
- **@questline/ui**: Shared React components

### Apps

- **@questline/web**: Next.js web application
- **@questline/extension**: Chrome extension (deferred scope)

## Scripts

```bash
# Development
npm run dev          # Start all apps
npm run build        # Build all packages and apps
npm run check        # Run all code checks (format, lint, type-check)
npm run lint         # Lint all packages
npm run format       # Format code with Prettier
npm run format:check # Check formatting only
npm run type-check   # TypeScript type checking

# Individual packages
cd packages/types && npm run build
cd packages/game-logic && npm run build
cd apps/web && npm run dev
```

### Code quality and Codex

Before opening a PR or requesting AI code review, run:

```bash
npm run check
```

This runs Prettier (format check), ESLint, and TypeScript in all workspaces. For AI-assisted code review with [OpenAI Codex](https://developers.openai.com/codex), see **AGENTS.md** for project context and how to use Codex (web, CLI, or GitHub Action).

## Environment Variables

### Web App (`apps/web/.env.local`)

```env
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
OPENROUTER_API_KEY=sk-or-v1-xxx
```

### Convex (`convex/.env.local`)

```env
OPENROUTER_API_KEY=sk-or-v1-xxx
```

## Deployment

### Vercel (Web App)

1. Connect your GitHub repository to Vercel
2. Set the root directory to `apps/web`
3. Add environment variables
4. Deploy!

### Chrome Extension

```bash
cd apps/extension
npm run build
# Load the dist/ folder in Chrome as an unpacked extension
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

---

Built with ❤️ for focused work and collaborative play.
