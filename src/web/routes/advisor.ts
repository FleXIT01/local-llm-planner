import { Hono } from "hono";
import { HardwareAdvisor } from "../../advisor/HardwareAdvisor.js";
import type { UserInput } from "../../types/index.js";

const advisor = new HardwareAdvisor();

export function advisorRoute(): Hono {
  const app = new Hono();

  app.post("/", async (c) => {
    let body: UserInput;
    try {
      body = await c.req.json<UserInput>();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    if (!body.goal || body.budget_eur == null) {
      return c.json({ error: "goal and budget_eur are required" }, 400);
    }

    const recommendation = advisor.recommend(body);
    return c.json(recommendation);
  });

  return app;
}
