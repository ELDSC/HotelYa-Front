import { validateApiOrigin } from "../src/config/env.ts";
import { parseEnv } from "node:util";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
const env = { ...parseEnv(readFileSync(".env", "utf8")), ...process.env };
const names = [
  "API_BASE_URL",
  "OWNER_LOGIN_EMAIL",
  "OWNER_LOGIN_PASSWORD",
  "ADMIN_LOGIN_EMAIL",
  "ADMIN_LOGIN_PASSWORD",
];
const config = Object.fromEntries(
  names.map((name) => {
    const value = env[`HOTELYA_${name}`];
    if (!value) throw new Error(`Configura HOTELYA_${name} en .env.`);
    return [name, value];
  }),
);
config.API_BASE_URL = validateApiOrigin(config.API_BASE_URL);
const args = process.argv
  .slice(2)
  .map((arg) =>
    arg.startsWith("--base=") ? arg.replace("--base=", "--base-href=") : arg,
  );
const child = spawn(
  process.execPath,
  [
    "node_modules/@angular/cli/bin/ng.js",
    ...args,
    "--define",
    `HOTELYA_CONFIG=${JSON.stringify(config)}`,
  ],
  { stdio: "inherit", env: process.env },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) => {
  if (signal) console.error("Angular terminó por señal:", signal);
  process.exit(code ?? 1);
});
