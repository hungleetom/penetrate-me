import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
const root = process.cwd();
// Every destructive target is a literal child of the selected checkout.
for (const relative of [
  "data/uploads",
  "data/fixtures.db",
  "data/fixtures.db-wal",
  "data/fixtures.db-shm",
]) {
  const target = resolve(root, relative);
  if (!target.startsWith(root + "\\") && !target.startsWith(root + "/"))
    throw new Error("Invalid reset path");
  rmSync(target, { recursive: true, force: true });
}
mkdirSync("data/uploads", { recursive: true });
const env = { ...process.env, DATABASE_URL: "file:./dev.db" };
function run(script, args = []) {
  const r = spawnSync(process.execPath, [resolve(script), ...args], {
    stdio: "inherit",
    env,
  });
  if (r.status !== 0) process.exit(r.status || 1);
}
run("scripts/assets.mjs");
// Prisma's Windows schema engine cannot initialize a missing SQLite file on
// some Unicode paths. Create the bounded empty file first, then apply tracked
// migrations. Resetting rows in seed.ts also avoids replacing a file held by a
// running Windows Prisma connection.
if (!existsSync("prisma/dev.db"))
  new DatabaseSync(resolve(root, "prisma/dev.db")).close();
if (!existsSync("node_modules/.prisma/client/index.js"))
  run("node_modules/prisma/build/index.js", ["generate"]);
run("node_modules/prisma/build/index.js", ["migrate", "deploy"]);
run("node_modules/tsx/dist/cli.mjs", ["scripts/seed.ts"]);
console.log("Disposable local environment restored. Start with npm run dev.");
