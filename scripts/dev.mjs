import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
if (!existsSync("prisma/dev.db")) {
  console.error("Initialize disposable data first: npm run db:reset");
  process.exit(1);
}
const production = process.argv.includes("--production");
const args = [
  resolve("node_modules/next/dist/bin/next"),
  production ? "start" : "dev",
  "--hostname",
  "127.0.0.1",
  "--port",
  "3000",
];
const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: "file:./dev.db",
    NEXT_TELEMETRY_DISABLED: "1",
  },
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code) => process.exit(code ?? 0));
