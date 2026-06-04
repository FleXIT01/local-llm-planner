import type { GPU } from "../types/index.js";

export function filterByBudget(gpus: GPU[], maxEur: number): GPU[] {
  return gpus.filter((g) => g.price_eur <= maxEur);
}

/** Sorts GPUs by VRAM-per-euro ratio (descending). */
export function sortByValue(gpus: GPU[]): GPU[] {
  return [...gpus].sort((a, b) => b.vram_gb / b.price_eur - a.vram_gb / a.price_eur);
}
