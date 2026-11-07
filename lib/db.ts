import { PrismaClient } from "@prisma/client";

const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const prisma =
  globalDb.prisma ??
  new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL || "file:./dev.db" } },
  });
if (process.env.NODE_ENV !== "production") globalDb.prisma = prisma;

export const userInclude = {
  profile: true,
  settings: true,
  premium: true,
  verification: true,
} as const;

export function publicUser(user: any, own = false) {
  if (!user) return null;
  const { passwordHash, email, sessions, settings, hidden, premium, ...safe } =
    user;
  return {
    ...safe,
    displayName: user.profile?.displayName || user.username,
    ...(own ? { email } : {}),
    premium: premium ? (own ? premium : { status: premium.status }) : null,
    verification: user.verification
      ? { ...user.verification, profileBadge: user.profile?.profileBadge || "" }
      : null,
    settings: settings
      ? {
          privateAccount: settings.privateAccount,
          allowMessages: settings.allowMessages,
          showActivity: settings.showActivity,
          ...(own ? { emailNotifications: settings.emailNotifications } : {}),
        }
      : undefined,
  };
}
