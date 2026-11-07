// Server-only snapshot: intentionally injectable SELECTs can never touch the live app DB.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { prisma, userInclude } from "./db";

const filename = resolve(process.cwd(), "data", "fixtures.db");
export async function seedFixtures() {
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  rmSync(filename, { force: true });
  const db = new DatabaseSync(filename);
  try {
    db.exec(
      "CREATE TABLE users(id TEXT, username TEXT, displayName TEXT, bio TEXT, avatar TEXT, hidden INTEGER); CREATE TABLE posts(id TEXT, body TEXT, username TEXT, image TEXT); CREATE TABLE accounts(id TEXT, username TEXT, email TEXT, premiumStatus TEXT, credits INTEGER, profileBadge TEXT);",
    );
    const insertUser = db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?)");
    const insertAccount = db.prepare(
      "INSERT INTO accounts VALUES(?,?,?,?,?,?)",
    );
    for (const u of await prisma.user.findMany({
      include: userInclude,
      orderBy: { id: "asc" },
    })) {
      insertUser.run(
        u.id,
        u.username,
        u.profile?.displayName || u.username,
        u.profile?.bio || "",
        u.profile?.avatar || "",
        u.hidden ? 1 : 0,
      );
      insertAccount.run(
        u.id,
        u.username,
        u.email,
        u.premium?.status || "FREE",
        u.premium?.credits || 0,
        u.profile?.profileBadge || "",
      );
    }
    const insertPost = db.prepare("INSERT INTO posts VALUES(?,?,?,?)");
    for (const p of await prisma.post.findMany({
      where: { isPrivate: false },
      include: { author: true },
      orderBy: { id: "asc" },
    }))
      insertPost.run(p.id, p.content, p.author.username, p.image || "");
  } finally {
    db.close();
  }
}
export function fixtureQuery(sql: string, values: (string | number)[] = []) {
  const db = new DatabaseSync(filename, {
    readOnly: true,
    allowExtension: false,
  });
  try {
    db.exec("PRAGMA query_only=ON");
    // SQLite prepares one SELECT, no multiple statements, no extensions or host paths.
    if (!/^SELECT\b/i.test(sql)) throw new Error("SELECT only");
    return db.prepare(sql).all(...values);
  } finally {
    db.close();
  }
}
