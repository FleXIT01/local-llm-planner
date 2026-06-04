import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";

const __dir = fileURLToPath(new URL(".", import.meta.url));
const presetsData = JSON.parse(readFileSync(resolve(__dir, "../../data/presets.json"), "utf-8"));

export function presetsRoute(): Hono {
  const app = new Hono();
  app.get("/", (c) => c.json(presetsData));
  return app;
}
