import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 md:flex-row md:items-center">
        <section className="fantasy-panel space-y-4 rounded-xl p-6 md:w-1/2">
          <p className="text-primary text-sm font-semibold uppercase tracking-[0.28em]">
            questLine
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Build your profile and start your first lobby.
          </h1>
          <p className="text-muted-foreground">
            Set up your player identity once and use it for game rooms, focus sessions, and team
            rounds.
          </p>
          <p className="text-muted-foreground text-sm">
            Already have a profile?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </section>
        <section className="md:w-1/2">
          <AuthForm mode="signup" />
        </section>
      </div>
    </main>
  );
}
