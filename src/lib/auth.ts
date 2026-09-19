import crypto from "crypto";
import { prisma } from "./db";
import { hashPassword, verifyPassword } from "./auth-passwords";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CASHIER";
  pin?: string | null;
  image?: string | null;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Session {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface SessionResult {
  session: Session;
  user: AuthUser;
}

const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function getAuthSecret(): string {
  return (
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "izah_pos_native_auth_secret_key_minimum_32_characters_long"
  );
}

export function signToken(token: string, secret: string = getAuthSecret()): string {
  const signature = crypto.createHmac("sha256", secret).update(token).digest("base64url");
  return `${token}.${signature}`;
}

export function verifyAndExtractToken(rawToken: string, secret: string = getAuthSecret()): string | null {
  if (!rawToken) return null;
  if (!rawToken.includes(".")) {
    // Unsigned raw token fallback
    return rawToken;
  }
  const [token, signature] = rawToken.split(".");
  if (!token || !signature) return null;
  const expectedSig = crypto.createHmac("sha256", secret).update(token).digest("base64url");
  const expectedLegacy = crypto.createHmac("sha256", secret).update(token).digest("base64");
  if (signature === expectedSig || signature === expectedLegacy) {
    return token;
  }
  return null;
}

function parseCookies(headerValue: string | undefined | null): Record<string, string> {
  const map: Record<string, string> = {};
  if (!headerValue) return map;
  const parts = headerValue.split(";");
  for (const part of parts) {
    const [rawKey, ...rawVal] = part.trim().split("=");
    if (rawKey) {
      map[rawKey.trim()] = decodeURIComponent(rawVal.join("=").trim());
    }
  }
  return map;
}

function extractTokenFromHeaders(
  headersObj: Headers | Record<string, string | string[] | undefined>
): string | null {
  let cookieHeader = "";
  if (typeof (headersObj as Headers)?.get === "function") {
    cookieHeader = (headersObj as Headers).get("cookie") || "";
  } else {
    const raw = (headersObj as Record<string, unknown>)["cookie"];
    cookieHeader = Array.isArray(raw) ? raw.join("; ") : (typeof raw === "string" ? raw : "");
  }

  const cookies = parseCookies(cookieHeader);
  const rawCookie =
    cookies["izah_session_token"] ||
    cookies["better-auth.session_token"] ||
    cookies["__Secure-better-auth.session_token"];

  if (!rawCookie) return null;
  return verifyAndExtractToken(rawCookie) || rawCookie.split(".")[0] || null;
}

export const auth = {
  $Infer: {} as {
    Session: {
      session: Session;
      user: AuthUser;
    };
  },

  api: {
    async getSession(options: {
      headers: Headers | Record<string, string | string[] | undefined>;
    }): Promise<SessionResult | null> {
      try {
        const token = extractTokenFromHeaders(options.headers);
        if (!token) return null;

        const dbSession = await prisma.session.findUnique({
          where: { token },
          include: { user: true },
        });

        if (!dbSession || !dbSession.user) return null;

        // Check expiration
        if (new Date() > dbSession.expiresAt) {
          await prisma.session.delete({ where: { id: dbSession.id } }).catch(() => {});
          return null;
        }

        return {
          session: {
            id: dbSession.id,
            token: dbSession.token,
            userId: dbSession.userId,
            expiresAt: dbSession.expiresAt,
            createdAt: dbSession.createdAt,
            updatedAt: dbSession.updatedAt,
            ipAddress: dbSession.ipAddress,
            userAgent: dbSession.userAgent,
          },
          user: {
            id: dbSession.user.id,
            name: dbSession.user.name,
            email: dbSession.user.email,
            role: dbSession.user.role as "ADMIN" | "CASHIER",
            pin: dbSession.user.pin,
            image: dbSession.user.image,
            emailVerified: dbSession.user.emailVerified,
            createdAt: dbSession.user.createdAt,
            updatedAt: dbSession.user.updatedAt,
          },
        };
      } catch (err) {
        console.error("[auth.getSession error]", err);
        return null;
      }
    },

    async signInEmail(params: {
      body: { email: string; password: string };
    }): Promise<{ user: AuthUser; session: Session; token: string }> {
      const { email, password } = params.body;
      const normalizedEmail = email.trim().toLowerCase();

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { accounts: true },
      });

      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Check account password
      const credentialAccount = user.accounts.find(
        (a) => a.providerId === "credential" || a.providerId === "credentials" || a.password
      );

      const storedPassword = credentialAccount?.password;
      if (!storedPassword || !verifyPassword(password, storedPassword)) {
        throw new Error("Invalid email or password");
      }

      // Generate session token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

      const dbSession = await prisma.session.create({
        data: {
          token: rawToken,
          userId: user.id,
          expiresAt,
        },
      });

      const signedToken = signToken(rawToken);

      const authUser: AuthUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as "ADMIN" | "CASHIER",
        pin: user.pin,
        image: user.image,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      const sessionObj: Session = {
        id: dbSession.id,
        token: rawToken,
        userId: user.id,
        expiresAt: dbSession.expiresAt,
        createdAt: dbSession.createdAt,
        updatedAt: dbSession.updatedAt,
      };

      return { user: authUser, session: sessionObj, token: signedToken };
    },

    async signUpEmail(params: {
      body: { email: string; password: string; name: string };
    }): Promise<{ user: AuthUser; session: Session; token: string }> {
      const { email, password, name } = params.body;
      const normalizedEmail = email.trim().toLowerCase();

      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existing) {
        throw new Error("User already exists with this email");
      }

      const hashedPassword = hashPassword(password);
      const rawToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

      const newUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name.trim(),
          role: "CASHIER",
          accounts: {
            create: {
              accountId: normalizedEmail,
              providerId: "credential",
              password: hashedPassword,
            },
          },
          sessions: {
            create: {
              token: rawToken,
              expiresAt,
            },
          },
        },
        include: {
          sessions: {
            where: { token: rawToken },
          },
        },
      });

      const dbSession = newUser.sessions[0];
      const signedToken = signToken(rawToken);

      const authUser: AuthUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role as "ADMIN" | "CASHIER",
        pin: newUser.pin,
        image: newUser.image,
        emailVerified: newUser.emailVerified,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      };

      const sessionObj: Session = {
        id: dbSession?.id || rawToken,
        token: rawToken,
        userId: newUser.id,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return { user: authUser, session: sessionObj, token: signedToken };
    },

    async signOut(options: {
      headers: Headers | Record<string, string | string[] | undefined>;
    }): Promise<void> {
      try {
        const token = extractTokenFromHeaders(options.headers);
        if (token) {
          await prisma.session.deleteMany({ where: { token } });
        }
      } catch (err) {
        console.error("[auth.signOut error]", err);
      }
    },

    async updateUser(params: {
      body: { name?: string; email?: string };
      headers: Headers | Record<string, string | string[] | undefined>;
    }): Promise<{ user: AuthUser }> {
      const sessionResult = await auth.api.getSession({ headers: params.headers });
      if (!sessionResult) throw new Error("Unauthorized");

      const updateData: { name?: string; email?: string } = {};
      if (params.body.name) updateData.name = params.body.name.trim();
      if (params.body.email) updateData.email = params.body.email.trim().toLowerCase();

      const updated = await prisma.user.update({
        where: { id: sessionResult.user.id },
        data: updateData,
      });

      return {
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role as "ADMIN" | "CASHIER",
          pin: updated.pin,
          image: updated.image,
          emailVerified: updated.emailVerified,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      };
    },

    async changePassword(params: {
      body: { currentPassword: string; newPassword: string };
      headers: Headers | Record<string, string | string[] | undefined>;
    }): Promise<{ success: boolean }> {
      const sessionResult = await auth.api.getSession({ headers: params.headers });
      if (!sessionResult) throw new Error("Unauthorized");

      const user = await prisma.user.findUnique({
        where: { id: sessionResult.user.id },
        include: { accounts: true },
      });

      if (!user) throw new Error("User not found");

      const credentialAccount = user.accounts.find(
        (a) => a.providerId === "credential" || a.providerId === "credentials" || a.password
      );

      if (!credentialAccount || !credentialAccount.password) {
        throw new Error("No password set for this user");
      }

      if (!verifyPassword(params.body.currentPassword, credentialAccount.password)) {
        throw new Error("Incorrect current password");
      }

      const newHashed = hashPassword(params.body.newPassword);
      await prisma.account.update({
        where: { id: credentialAccount.id },
        data: { password: newHashed },
      });

      return { success: true };
    },
  },
};
