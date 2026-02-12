"use client";

import { useEffect, useMemo, useState } from "react";

const SESSION_STORAGE_KEY = "questline.session.user";

export type SessionUser = {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
};

function readSessionFromStorage(): SessionUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed.userId || !parsed.email || !parsed.displayName) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveSessionUser(user: SessionUser) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
}

export function clearSessionUser() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function useSessionUser() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setSessionUser(readSessionFromStorage());
    setIsHydrated(true);
  }, []);

  const updateSession = (user: SessionUser | null) => {
    if (user) {
      saveSessionUser(user);
      setSessionUser(user);
      return;
    }

    clearSessionUser();
    setSessionUser(null);
  };

  return useMemo(
    () => ({
      sessionUser,
      isHydrated,
      setSessionUser: updateSession,
    }),
    [sessionUser, isHydrated]
  );
}
