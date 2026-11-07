import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { DatabaseSync } from "node:sqlite";

// Run with the app stopped. This is intentionally independent of the HTTP suite.
const root = process.cwd();
function reset() {
  const result = spawnSync(
    process.execPath,
    [resolve(root, "scripts/reset.mjs")],
    {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: "file:./dev.db" },
    },
  );
  assert.equal(result.status, 0, "reset command must complete successfully");
}
function db() {
  return new PrismaClient({ datasources: { db: { url: "file:./dev.db" } } });
}
const tables = [
  "user",
  "profile",
  "session",
  "post",
  "comment",
  "like",
  "follow",
  "conversation",
  "conversationParticipant",
  "message",
  "photo",
  "photoAlbum",
  "notification",
  "accountSetting",
  "blockedUser",
  "premiumSubscription",
  "verificationStatus",
];
async function snapshot(client) {
  const rows = {};
  for (const table of tables) {
    rows[table] = (
      await client[table].findMany({ orderBy: { id: "asc" } })
    ).map(({ updatedAt, ...record }) => record);
  }
  return JSON.parse(JSON.stringify(rows));
}
function fixtureSnapshot() {
  const connection = new DatabaseSync(resolve(root, "data/fixtures.db"), {
    readOnly: true,
  });
  try {
    return Object.fromEntries(
      ["users", "posts", "accounts"].map((table) => [
        table,
        connection.prepare(`SELECT * FROM ${table} ORDER BY id`).all(),
      ]),
    );
  } finally {
    connection.close();
  }
}

reset();
const first = db();
let baseline;
let fixtureBaseline;
try {
  baseline = await snapshot(first);
  fixtureBaseline = fixtureSnapshot();
  assert.equal(fixtureBaseline.users.length, 16);
  assert.equal(fixtureBaseline.accounts.length, 16);
  assert.ok(fixtureBaseline.posts.length >= 50);
  assert.equal(baseline.user.length, 16);
  assert.equal(baseline.user.filter((u) => !u.hidden).length, 15);
  assert.ok(baseline.post.filter((p) => !p.isPrivate).length >= 50);
  assert.ok(baseline.comment.length >= 100);
  assert.ok(baseline.conversation.length >= 20);
  assert.ok(baseline.photoAlbum.filter((a) => a.isPrivate).length >= 10);
  assert.ok(baseline.notification.length >= 30);
  assert.ok(baseline.follow.length > 30);
  assert.equal(baseline.session.length, 0);
  assert.equal(
    baseline.user.find((u) => u.username === "kevin_admin").role,
    "ADMIN",
  );
  assert.match(
    baseline.profile.find((p) => p.userId === "u-hidden").bio,
    /we need to talk about your hobbies/,
  );
  assert.ok(
    baseline.message.some(
      (m) =>
        m.conversationId === "convo-1" &&
        m.content.includes("random cybersecurity scanner"),
    ),
  );
  assert.equal(
    baseline.photoAlbum.find((a) => a.id === "album-1").name,
    "Evidence I was productive today",
  );
  assert.equal(baseline.photo.filter((p) => p.albumId === "album-1").length, 4);
  assert.equal(
    baseline.photo.filter(
      (p) => p.albumId === "album-1" && /^cat-[1-3]\.svg$/.test(p.filename),
    ).length,
    3,
  );
  assert.equal(
    baseline.photo.filter(
      (p) => p.albumId === "album-1" && p.filename === "todo.svg",
    ).length,
    1,
  );
  const premium = baseline.premiumSubscription.find(
    (p) => p.userId === "u-kevin",
  );
  assert.equal(premium.status, "LIFETIME");
  assert.equal(premium.credits, 999999999);
  assert.equal(
    baseline.profile.find((p) => p.userId === "u-kevin").profileBadge,
    "Financially irresponsible",
  );
  for (const asset of ["cat-1.svg", "cat-2.svg", "cat-3.svg", "todo.svg"]) {
    assert.ok(
      readFileSync(resolve(root, "data/seed-media", asset)).length > 100,
    );
  }
  await first.post.create({
    data: {
      id: "reset-repro-post",
      authorId: "u-alex",
      content: "Disposable reset verification write",
    },
  });
  await first.profile.update({
    where: { userId: "u-alex" },
    data: { bio: "Changed by reset verification" },
  });
  await first.session.create({
    data: {
      id: "reset-repro-session",
      token: "disposable-reset-token",
      userId: "u-alex",
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  await first.premiumSubscription.update({
    where: { userId: "u-dan" },
    data: { status: "LIFETIME", credits: 0 },
  });
  mkdirSync(resolve(root, "data/uploads"), { recursive: true });
  writeFileSync(
    resolve(root, "data/uploads/reset-repro.txt"),
    "This file must be removed by reset.",
  );
  const fixtureWrite = new DatabaseSync(resolve(root, "data/fixtures.db"));
  try {
    fixtureWrite
      .prepare("UPDATE users SET bio=? WHERE id=?")
      .run("Changed by reset verification", "u-hidden");
  } finally {
    fixtureWrite.close();
  }
} finally {
  await first.$disconnect();
}

reset();
const second = db();
try {
  assert.deepEqual(
    await snapshot(second),
    baseline,
    "all seeded relational data should return to the initial semantic state",
  );
  assert.deepEqual(
    fixtureSnapshot(),
    fixtureBaseline,
    "the isolated injection database should be recreated from the original seed",
  );
  assert.deepEqual(
    readdirSync(resolve(root, "data/uploads")),
    [],
    "reset must clear uploaded runtime media",
  );
} finally {
  await second.$disconnect();
}
console.log(
  "Reset verified: minimum dataset, canonical database Easter eggs, every seeded table, cleared sessions and uploads.",
);
