import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
for (const [script, args] of [
  ["scripts/assets.mjs", []],
  ["node_modules/tsx/dist/cli.mjs", ["scripts/seed.ts"]],
]) {
  const r = spawnSync(process.execPath, [resolve(script), ...args], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "file:./dev.db" },
  });
  if (r.status) process.exit(r.status);
}
