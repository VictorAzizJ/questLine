# questLine
🎲 Questline

TTRPG-powered focus, collaboration, and play

Questline is a web-based TTRPG platform that combines AI Dungeon Masters, social role-playing games, and productivity mechanics to support focused work, learning, and collaborative play.

The platform supports traditional tabletop experiences (AI-assisted campaigns, character sheets, dice rolling, social deduction games) and a separate, opt-in Work / Education Mode that reframes focus sessions as shared quests—without task surveillance or productivity policing.

✨ Core Concept

Questline treats time and attention as gameplay, not metrics.

Focus sessions become encounters

Breaks unlock narrative beats

Teams progress by showing up consistently

AI facilitates structure, not control

The result is a system that works equally well for:

Remote teams

Fellowships & cohorts

Study groups

Creative communities

Traditional TTRPG players

🧠 Modes
1. Play Mode (Traditional TTRPG)

Classic tabletop-inspired gameplay with AI assistance.

AI Dungeon Master (Groq / Llama 3.1)

Character creation & management (D&D 5e-inspired)

Dice rolling engine with visual feedback

Multiplayer lobbies & sessions

Campaign templates & starter adventures

Context-aware AI narration

Chat-based gameplay with history

2. Social Deduction Mode (Werewolf)

A fully playable social deduction game with AI narration and players.

Complete Werewolf / Mafia implementation

Lobby system with invite codes

9+ unique roles (Werewolf, Seer, Doctor, Hunter, Witch, etc.)

Night / Day phase system

Voting mechanics & win condition detection

AI-powered narration and village lore

Smart AI players (multiple difficulty levels)

Real-time suspicion tracking

3. Work / Education Mode (NEW)

A separate context, designed for focus—not entertainment-first play.

Solo or group focus sessions (Pomodoro-inspired)

“Quest Timers” instead of productivity timers

Optional silent co-focus rooms

XP / progression unlocked by session completion

Break phases tied to narrative or light interactions

No task tracking or content monitoring

Designed for consent-based participation

Use cases:

Fellowships & bootcamps

Study groups

Remote teams

Classrooms & learning labs

🧩 Sponsorship & Incentives Layer (Planned)

Designed to support organizations without surveillance or ads.

Sponsor-backed rewards (credits, perks, unlocks)

Branded but lore-friendly campaigns

Seasonal or cohort-based incentives

Optional engagement analytics (time-based only)

Suitable for:

Fellowships

Educational institutions

Conferences

HR engagement pilots

🛠 Tech Stack

Frontend

Next.js 14

TypeScript

Tailwind CSS

Backend

Supabase (Auth, Database, Realtime)

AI

Groq API

Llama 3.1 models

State Management

Zustand

Deployment

Vercel

📁 Project Structure
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── character/       # Character creation & management
│   ├── play/            # Game session interface
│   ├── werewolf/        # Social deduction game mode
│   └── api/
│       ├── chat/        # AI DM endpoints
│       └── werewolf/    # Werewolf AI logic
│
├── components/
│   ├── character/       # Character sheet UI
│   ├── dice/            # Dice roller UI
│   ├── chat/            # Chat & narration UI
│   └── werewolf/        # Werewolf UI components
│       ├── RoleCard.tsx
│       ├── PlayerGrid.tsx
│       ├── VotingUI.tsx
│       ├── NightActionUI.tsx
│       └── WerewolfLobby.tsx
│
├── lib/
│   ├── supabase/        # Supabase client utilities
│   ├── ai/              # AI integrations
│   ├── game/            # Shared game mechanics
│   └── werewolf/        # Werewolf game logic
│       ├── game-utils.ts
│       ├── storage.ts
│       └── prompts.ts
│
└── types/
    ├── character.ts
    ├── chat.ts
    ├── dice.ts
    └── werewolf.ts

✅ MVP Feature Status
Core Gameplay

Character creation & persistence

Dice rolling (d4–d100)

Dice history & notation support

AI Dungeon Master integration

Starter campaigns

Chat-based sessions

Context-aware narration

Werewolf Mode

Full game loop

Lobby & invites

AI narration & players

Role logic & win detection

Polish

Responsive UI

Dark theme optimized for long sessions

Animations & transitions

Loading & error states

Documentation

Setup guide

API overview

Demo walkthrough

Deployment instructions

🚀 Development Notes

Built as a modular system to support:

New game modes

Work vs Play separation

Future mobile clients

Designed for refactoring during AI Fellowship

Focus on structure + consent, not surveillance

🧭 Roadmap (High Level)

Pomodoro → Quest abstraction

Organization “Realms”

Admin / facilitator dashboards

Sponsor incentive hooks

Mobile roadmap (iOS)

Additional social games

Multiplayer campaign persistence

⏱ Demo Info

Estimated demo time: 5–7 minutes

Initial build time: ~7 days

Budget: $0–$50 (MVP testing)
