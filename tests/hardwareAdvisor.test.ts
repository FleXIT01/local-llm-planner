import { describe, expect, it } from "vitest";
import { HardwareAdvisor } from "../src/advisor/HardwareAdvisor.js";
import type { UserInput } from "../src/types/index.js";

const advisor = new HardwareAdvisor();

const input = (goal: UserInput["goal"], budget = 800): UserInput => ({
  goal,
  budget_eur: budget,
});

describe("HardwareAdvisor.recommend", () => {
  it("returns three tiers", () => {
    const rec = advisor.recommend(input("chat"));
    expect(rec.options.map((o) => o.tier)).toEqual(["budget", "best_value", "overkill"]);
  });

  it("budget tier never exceeds the budget when affordable GPUs exist", () => {
    const rec = advisor.recommend(input("chat", 400));
    const budget = rec.options.find((o) => o.tier === "budget");
    expect(budget!.gpu.price_eur).toBeLessThanOrEqual(400);
  });

  it("overkill tier has the most VRAM of the affordable pool", () => {
    const rec = advisor.recommend(input("coding", 600));
    const overkill = rec.options.find((o) => o.tier === "overkill");
    const others = rec.options.filter((o) => o.tier !== "overkill");
    expect(overkill!.gpu.vram_gb).toBeGreaterThanOrEqual(
      Math.max(...others.map((o) => o.gpu.vram_gb))
    );
  });

  it("recommended model fits in the GPU VRAM at the chosen quantization", () => {
    const rec = advisor.recommend(input("chat", 500));
    for (const option of rec.options) {
      expect(option.vram_required_gb).toBeLessThanOrEqual(option.gpu.vram_gb);
      expect(option.vram_fits).toBe(true);
    }
  });

  it("falls back to the full GPU list when nothing is affordable", () => {
    const rec = advisor.recommend(input("chat", 10));
    expect(rec.options.length).toBe(3);
  });
});
