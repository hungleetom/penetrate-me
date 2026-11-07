import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma, userInclude } from "./db";

export function hashPassword(
  password: string,
  salt = randomBytes(16).toString("hex"),
) {
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}
export function checkPassword(password: string, saved: string) {
  try {
    const [salt, hash] = saved.split(":");
    const actual = scryptSync(password, salt, 32);
    const expected = Buffer.from(hash, "hex");
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}
export function sessionToken(request: Request) {
  return (
    (request.headers.get("cookie") || "")
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("pm_session="))
      ?.slice(11) || ""
  );
}
export async function getUser(request: Request) {
  const token = sessionToken(request);
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: userInclude } },
  });
  if (!session || session.revoked || session.expiresAt < new Date())
    return null;
  return session.user;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { token, userId, expiresAt: new Date(Date.now() + 7 * 86400000) },
  });
  return token;
}
export function sessionCookie(token: string) {
  return `pm_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
}
