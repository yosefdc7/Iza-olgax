import crypto from "crypto";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Signs a session token with the Better Auth secret using HMAC SHA-256.
 */
function signSessionToken(token: string, secret: string): string {
  const signature = crypto.createHmac("sha256", secret).update(token).digest("base64");
  return `${token}.${signature}`;
}

/**
 * Creates a valid Better Auth session for the given user ID,
 * signs the session token matching Better Auth convention,
 * and attaches the session cookies to the response.
 */
export async function createPosCashierSession(userId: string): Promise<string> {
  const ctx = await (auth as unknown as { $context: Promise<{ internalAdapter: { createSession: (uid: string) => Promise<{ token: string; expiresAt: Date }> } }> }).$context;
  const session = await ctx.internalAdapter.createSession(userId);

  const secret = process.env.BETTER_AUTH_SECRET || "";
  const signedToken = signSessionToken(session.token, secret);

  const cookieStore = await cookies();
  const isSecure = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  };

  cookieStore.set("better-auth.session_token", signedToken, cookieOptions);
  cookieStore.set("izah-setup-complete", "1", {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    maxAge: 31536000,
    path: "/",
  });

  if (isSecure) {
    cookieStore.set("__Secure-better-auth.session_token", signedToken, {
      ...cookieOptions,
      secure: true,
    });
  }

  return session.token;
}
