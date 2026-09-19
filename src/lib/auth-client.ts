"use client";

import { useEffect, useState, useCallback } from "react";
import type { AuthUser, Session, SessionResult } from "./auth";

export interface SignInEmailParams {
  email: string;
  password: string;
}

export interface SignInResult {
  data: { user: AuthUser; session: Session } | null;
  error: { message: string; code?: string; status?: number } | null;
}

export const signIn = {
  async email(params: SignInEmailParams): Promise<SignInResult> {
    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json.error) {
        return {
          data: null,
          error: {
            message: json?.error?.message || "Invalid email or password",
            code: json?.error?.code || "INVALID_CREDENTIALS",
            status: res.status,
          },
        };
      }

      return {
        data: {
          user: json.user,
          session: json.session,
        },
        error: null,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in. Please try again.";
      return {
        data: null,
        error: {
          message,
          status: 500,
        },
      };
    }
  },
};

export async function signOut(): Promise<void> {
  try {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Sign out error", err);
  }
}

export async function getSession(): Promise<{ data: SessionResult | null; error: Error | null }> {
  try {
    const res = await fetch("/api/auth/get-session", { cache: "no-store" });
    if (!res.ok) return { data: null, error: new Error(`Status ${res.status}`) };
    const data = await res.json();
    return { data: data || null, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err : new Error("Failed to get session") };
  }
}

export function useSession() {
  const [data, setData] = useState<SessionResult | null>(null);
  const [isPending, setIsPending] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/get-session", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json || null);
      } else {
        setData(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error("Failed to fetch session"));
      setData(null);
    } finally {
      setIsPending(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return {
    data,
    isPending,
    error,
    refetch: fetchSession,
  };
}

export const authClient = {
  signIn,
  signOut,
  getSession,
  useSession,
};
