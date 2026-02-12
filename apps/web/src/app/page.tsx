import Link from "next/link";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@questline/ui";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <p className="text-primary mb-4 text-xs font-semibold uppercase tracking-[0.35em]">
          Legendary Sessions Await
        </p>
        <h1 className="fantasy-hero-title mb-4">
          quest<span className="text-primary">Line</span>
        </h1>
        <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-xl">
          Web-first TTRPG campaign play for D&D-style tables, with real-time party tools and AI
          assistance.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/lobby">
            <Button size="lg" className="w-full sm:w-auto">
              Start Playing
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              Sign In
            </Button>
          </Link>
          <a href="#features">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Learn More
            </Button>
          </a>
        </div>
      </section>

      {/* Experience Tracks */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold uppercase">Current Product Scope</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {/* D&D Campaigns (primary) */}
          <Card className="fantasy-panel hover:border-primary/70 transition-all hover:-translate-y-1">
            <CardHeader>
              <div className="mb-2 text-4xl">🛡️</div>
              <CardTitle>D&D Campaign Play</CardTitle>
              <CardDescription>
                Generic tabletop gameplay first: party sessions, encounter flow, chat, and dice in
                one shared web room.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-muted-foreground mb-4 space-y-2 text-sm">
                <li>• Web multiplayer at a single URL</li>
                <li>• D20 + multi-die support</li>
                <li>• AI-assisted narration</li>
              </ul>
              <Link href="/lobby">
                <Button className="w-full">Start Campaign</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Focus Companion (secondary) */}
          <Card className="fantasy-panel hover:border-primary/70 transition-all hover:-translate-y-1">
            <CardHeader>
              <div className="mb-2 text-4xl">⏱️</div>
              <CardTitle>Focus Quest</CardTitle>
              <CardDescription>
                Optional productivity sessions that can enhance table prep and between-session
                progress.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-muted-foreground mb-4 space-y-2 text-sm">
                <li>• Solo or team focus</li>
                <li>• Pomodoro-powered</li>
                <li>• Game progression rewards</li>
              </ul>
              <Button variant="secondary" className="w-full" disabled>
                Secondary Track
              </Button>
            </CardContent>
          </Card>

          {/* Werewolf + Extension (deferred) */}
          <Card className="fantasy-panel hover:border-primary/70 transition-all hover:-translate-y-1">
            <CardHeader>
              <div className="mb-2 text-4xl">🐺</div>
              <CardTitle>Werewolf + Extension</CardTitle>
              <CardDescription>
                Social deduction and browser extension features are intentionally deferred until
                core web TTRPG flow is stable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-muted-foreground mb-4 space-y-2 text-sm">
                <li>• Revisited after web MVP</li>
                <li>• Reuses shared logic packages</li>
                <li>• No blocker for web launch</li>
              </ul>
              <Button variant="outline" className="w-full" disabled>
                Deferred
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-secondary/25 border-border/60 border-y py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold uppercase">Why questLine?</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="fantasy-panel rounded-lg p-4 text-center">
              <div className="mb-3 text-3xl">🎮</div>
              <h3 className="mb-2 font-semibold">Gamified Focus</h3>
              <p className="text-muted-foreground text-sm">
                Turn productivity into play with game mechanics that reward consistency
              </p>
            </div>
            <div className="fantasy-panel rounded-lg p-4 text-center">
              <div className="mb-3 text-3xl">🤖</div>
              <h3 className="mb-2 font-semibold">AI-Powered</h3>
              <p className="text-muted-foreground text-sm">
                Smart narration and assistant tooling support the DM instead of replacing the table
              </p>
            </div>
            <div className="fantasy-panel rounded-lg p-4 text-center">
              <div className="mb-3 text-3xl">⚡</div>
              <h3 className="mb-2 font-semibold">Real-time</h3>
              <p className="text-muted-foreground text-sm">
                Instant updates and live collaboration with your team
              </p>
            </div>
            <div className="fantasy-panel rounded-lg p-4 text-center">
              <div className="mb-3 text-3xl">🔒</div>
              <h3 className="mb-2 font-semibold">No Surveillance</h3>
              <p className="text-muted-foreground text-sm">
                Focus on structure, not monitoring. Consent-based participation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-border/70 border-t py-8">
        <div className="text-muted-foreground container mx-auto px-4 text-center text-sm">
          <p>questLine - Web-first D&D/TTRPG gameplay for collaborative tables</p>
        </div>
      </footer>
    </main>
  );
}
