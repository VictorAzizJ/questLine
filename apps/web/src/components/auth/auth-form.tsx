"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@questline/ui";
import { api } from "@convex/_generated/api";
import { saveSessionUser, useSessionUser } from "@/lib/auth-session";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { sessionUser, isHydrated } = useSessionUser();
  const createOrGetUser = useMutation(api.auth.getOrCreateUser);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = useMemo(() => (mode === "login" ? "Welcome back" : "Create your account"), [mode]);
  const subtitle = useMemo(
    () =>
      mode === "login"
        ? "Sign in with your display name and email to jump back in."
        : "Set up your player profile to host and join lobbies.",
    [mode]
  );

  useEffect(() => {
    if (isHydrated && sessionUser) {
      router.replace("/lobby");
    }
  }, [isHydrated, sessionUser, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = displayName.trim();
    const normalizedAvatar = avatarUrl.trim();

    if (!normalizedName) {
      setError("Display name is required.");
      return;
    }
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("A valid email is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const userId = await createOrGetUser({
        email: normalizedEmail,
        displayName: normalizedName,
        avatarUrl: normalizedAvatar || undefined,
      });

      saveSessionUser({
        userId,
        email: normalizedEmail,
        displayName: normalizedName,
        avatarUrl: normalizedAvatar || undefined,
      });
      router.push("/lobby");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="fantasy-panel mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Village Strategist"
              className="fantasy-input w-full"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="fantasy-input w-full"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="avatarUrl" className="text-sm font-medium">
              Avatar URL (optional)
            </label>
            <input
              id="avatarUrl"
              type="url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://example.com/avatar.png"
              className="fantasy-input w-full"
            />
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
