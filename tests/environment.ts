import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { validateApiOrigin } from "../src/config/env";
const env = {
  ...parseEnv(readFileSync(new URL("../.env", import.meta.url), "utf8")),
  ...process.env,
};
export const api = validateApiOrigin(env.HOTELYA_API_BASE_URL);
export const base = env.HOTELYA_E2E_BASE;
if (!base || !/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))
  throw Error("HOTELYA_E2E_BASE debe ser / o una subruta terminada en /.");
if (!["0", "1"].includes(env.HOTELYA_E2E_REUSE_SERVER ?? ""))
  throw Error("HOTELYA_E2E_REUSE_SERVER debe ser 0 o 1.");
export const reuse = env.HOTELYA_E2E_REUSE_SERVER === "1";
