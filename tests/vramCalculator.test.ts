import { describe, expect, it } from "vitest";
import { bestQuantForVram, calcVram, fitsInVram } from "../src/advisor/vramCalculator.js";

// Formula: (params_b × bits) / 8 × 1.2
// e.g. 70B Q4 = 70×4/8×1.2 = 42 GB

describe("calcVram", () => {
  it("Llama 3.1 70B Q4 ≈ 42 GB", () => {
    expect(calcVram(70, "q4")).toBeCloseTo(42, 0);
  });

  it("Mistral 7B Q4 ≈ 4.2 GB", () => {
    expect(calcVram(7, "q4")).toBeCloseTo(4.2, 1);
  });

  it("scales linearly with bits", () => {
    const q4 = calcVram(13, "q4");
    const q8 = calcVram(13, "q8");
    expect(q8).toBeCloseTo(q4 * 2, 1);
  });

  it("applies 1.2 overhead factor", () => {
    // 7B Q8 = 7 × 8 / 8 × 1.2 = 8.4 GB
    expect(calcVram(7, "q8")).toBeCloseTo(8.4, 1);
  });
});

describe("fitsInVram", () => {
  it("Llama 3.2 3B Q4 fits in 4 GB", () => {
    // 3×4/8×1.2 = 1.8 GB < 4 GB
    expect(fitsInVram(3, "q4", 4)).toBe(true);
  });

  it("Llama 3.3 70B Q4 does not fit in 24 GB", () => {
    // 70×4/8×1.2 = 42 GB > 24 GB
    expect(fitsInVram(70, "q4", 24)).toBe(false);
  });

  it("Llama 3.3 70B Q4 fits in 48 GB", () => {
    expect(fitsInVram(70, "q4", 48)).toBe(true);
  });

  it("Mistral 7B FP16 does not fit in 8 GB", () => {
    // 7×16/8×1.2 = 16.8 GB > 8 GB
    expect(fitsInVram(7, "fp16", 8)).toBe(false);
  });
});

describe("bestQuantForVram", () => {
  it("returns fp16 for Llama 3.2 3B on 24 GB", () => {
    // 3×16/8×1.2 = 7.2 GB < 24 GB → fp16 fits
    expect(bestQuantForVram(3, 24)).toBe("fp16");
  });

  it("returns q6 for Mistral 7B on 8 GB", () => {
    // fp16=16.8, q8=8.4 — both exceed 8 GB; q6=7×6/8×1.2=6.3 GB fits
    expect(bestQuantForVram(7, 8)).toBe("q6");
  });

  it("returns null when nothing fits", () => {
    // 405B Q3 = 405×3/8×1.2 = 182.25 GB > 24 GB
    expect(bestQuantForVram(405, 24)).toBeNull();
  });

  it("prefers higher quality quants", () => {
    // 7B fp16=16.8 > 16, q8=8.4 ≤ 16 → returns q8
    expect(bestQuantForVram(7, 16)).toBe("q8");
  });
});
