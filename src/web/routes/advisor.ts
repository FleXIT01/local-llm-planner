import { Hono } from "hono";
import { HardwareAdvisor } from "../../advisor/HardwareAdvisor.js";
import type { UseCase, UserInput } from "../../types/index.js";

const USE_CASES: readonly UseCase[] = ["chat", "coding", "image_gen", "multimodal"];

export function advisorRoute(): Hono {
  const app = new Hono();
  const advisor = new HardwareAdvisor();

  app.post("/", async (c) => {
    let body: UserInput;
    try {
      body = await c.req.json<UserInput>();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    if (!body.goal || !USE_CASES.includes(body.goal)) {
      return c.json({ error: `goal is required and must be one of: ${USE_CASES.join(", ")}` }, 400);
    }

    if (
      typeof body.budget_eur !== "number" ||
      !Number.isFinite(body.budget_eur) ||
      body.budget_eur < 0
    ) {
      return c.json({ error: "budget_eur must be a non-negative finite number" }, 400);
    }

    const recommendation = advisor.recommend(body);
    return c.json(recommendation);
  });

  return app;
}
