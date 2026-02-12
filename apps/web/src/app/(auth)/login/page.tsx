import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 md:flex-row md:items-center">
        <section className="fantasy-panel space-y-4 rounded-xl p-6 md:w-1/2">
          <p className="text-primary text-sm font-semibold uppercase tracking-[0.28em]">
            questLine
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Return to your village and continue the game.
          </h1>
          <p className="text-muted-foreground">
            Sign in to host lobbies, vote in day phase, and collaborate in real-time chat.
          </p>
          <p className="text-muted-foreground text-sm">
            New here?{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </section>
        <section className="md:w-1/2">
          <AuthForm mode="login" />
        </section>
      </div>
    </main>
  );
}
