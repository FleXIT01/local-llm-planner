import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { advisorRoute } from "./routes/advisor.js";
import { presetsRoute } from "./routes/presets.js";

const __dir = fileURLToPath(new URL(".", import.meta.url));
const HTML = readFileSync(resolve(__dir, "public/index.html"), "utf-8");

export function createApp(): Hono {
  const app = new Hono();
  app.use("*", cors());

  app.get("/", (c) => c.html(HTML));
  app.route("/api/recommend", advisorRoute());
  app.route("/api/presets", presetsRoute());

  return app;
}

export function startServer(port = 3000): void {
  const app = createApp();
  serve({ fetch: app.fetch, port });
  console.log(`local-llm-planner running at http://localhost:${port}`);
  console.log("Press Ctrl+C to stop.");
}
