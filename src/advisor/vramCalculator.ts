import type { Quantization } from "../types/index.js";

export const QUANT_BITS: Record<Quantization, number> = {
  fp16: 16,
  q8: 8,
  q6: 6,
  q5: 5,
  q4: 4,
  q3: 3,
};

const OVERHEAD = 1.2;

/** Calculates VRAM required in GB for a model at a given quantization. */
export function calcVram(params_b: number, quant: Quantization): number {
  const bits = QUANT_BITS[quant];
  // params_b × bits → bits total; ÷8 → bytes; "billions" already cancel (10^9 / 10^9)
  return ((params_b * bits) / 8) * OVERHEAD;
}

/** Returns true if the model fits in the given VRAM at the specified quantization. */
export function fitsInVram(params_b: number, quant: Quantization, vram_gb: number): boolean {
  return calcVram(params_b, quant) <= vram_gb;
}

/**
 * Returns the best (highest quality) quantization that fits in the given VRAM,
 * or null if even Q3 doesn't fit.
 */
export function bestQuantForVram(params_b: number, vram_gb: number): Quantization | null {
  const quants: Quantization[] = ["fp16", "q8", "q6", "q5", "q4", "q3"];
  for (const quant of quants) {
    if (fitsInVram(params_b, quant, vram_gb)) return quant;
  }
  return null;
}
