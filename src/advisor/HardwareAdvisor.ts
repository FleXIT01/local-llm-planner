import gpusData from "../data/gpus.json" with { type: "json" };
import modelsData from "../data/models.json" with { type: "json" };
import type {
  GPU,
  LLMModel,
  Quantization,
  Recommendation,
  RecommendationOption,
  UseCase,
  UserInput,
} from "../types/index.js";
import { filterByBudget, sortByValue } from "./budgetFilter.js";
import { bestQuantForVram, calcVram } from "./vramCalculator.js";

const ALL_GPUS = gpusData as GPU[];
const ALL_MODELS = modelsData as LLMModel[];

function ollamaTag(modelId: string, quant: Quantization): string {
  const tagMap: Record<string, string> = {
    "llama3.3-70b": "llama3.3:70b",
    "llama3.2-11b": "llama3.2:11b",
    "llama3.2-3b": "llama3.2:3b",
    "mistral-7b": "mistral:7b",
    "mixtral-8x7b": "mixtral:8x7b",
    "deepseek-coder-v3": "deepseek-coder-v3:latest",
    "phi4-mini": "phi4-mini",
    phi4: "phi4",
    "gemma3-27b": "gemma3:27b",
    "gemma3-9b": "gemma3:9b",
    "qwen2.5-72b": "qwen2.5:72b",
    "qwen2.5-14b": "qwen2.5:14b",
    sdxl: "huggingface-cli download stabilityai/stable-diffusion-xl-base-1.0",
    "flux-schnell": "huggingface-cli download black-forest-labs/FLUX.1-schnell",
    "flux-dev": "huggingface-cli download black-forest-labs/FLUX.1-dev",
  };
  const imageGenIds = new Set(["sdxl", "flux-schnell", "flux-dev"]);
  if (imageGenIds.has(modelId)) {
    return tagMap[modelId] ?? `huggingface-cli download ${modelId}`;
  }
  const base = tagMap[modelId] ?? modelId;
  const quantSuffix = quant !== "fp16" ? `-${quant}` : "";
  return `ollama pull ${base}${quantSuffix}`;
}

function setupNotes(gpu: GPU, quant: Quantization, goal: UseCase): string[] {
  const notes: string[] = [];
  if (goal === "image_gen") {
    notes.push("Requires ComfyUI or Automatic1111 — Ollama does not support image generation.");
    notes.push("Install ComfyUI: https://github.com/comfyanonymous/ComfyUI");
    notes.push("Install huggingface_hub to download: pip install huggingface_hub");
  }
  if (gpu.manufacturer === "amd") {
    if (gpu.id === "mi300x" || gpu.id.startsWith("radeon_pro") || gpu.id === "rx7900xtx") {
      notes.push("ROCm 6+ required. Install Ollama ROCm build on Linux for best performance.");
    } else {
      notes.push("ROCm required. Install Ollama with ROCm support — best on Linux.");
    }
  }
  if (gpu.manufacturer === "intel") {
    notes.push("Intel XPU/SYCL backend. Use Ollama with Intel GPU support (Linux recommended).");
    notes.push("Alternative: use llama.cpp with -DLLAMA_SYCL=ON and Intel oneAPI toolkit.");
  }
  if (gpu.manufacturer === "apple") {
    notes.push("Metal backend is automatic. No CUDA or ROCm needed.");
    notes.push("Ollama uses unified memory directly — all RAM is available to the model.");
  }
  if (gpu.id === "dual_rtx3090") {
    notes.push("NVLink bridge required for shared VRAM. Use llama.cpp: -ngl 99 -ts 1,1");
    notes.push("Alternative: set OLLAMA_NUM_GPU=2 for tensor parallelism without NVLink.");
  }
  if (
    gpu.id === "h100_80gb" ||
    gpu.id === "a100_80gb" ||
    gpu.id === "a100_40gb" ||
    gpu.id === "mi300x"
  ) {
    notes.push(
      "Server/data center GPU — typically accessed via cloud (AWS, GCP, CoreWeave) or HPC cluster."
    );
  }
  if (quant === "q3") {
    notes.push(
      "Q3 quantization causes noticeable quality loss. Consider more VRAM for Q4 or higher."
    );
  }
  if (goal !== "image_gen") {
    notes.push("Install Ollama: https://ollama.com/download");
  }
  return notes;
}

/** Picks the best-fitting model for a GPU+goal combo, preferring larger models at better quants. */
function pickBestModel(gpu: GPU, goal: UseCase, models: LLMModel[]): LLMModel {
  const candidates = models
    .filter((m) => m.use_cases.includes(goal))
    .map((m) => {
      const quant = bestQuantForVram(m.params_b, gpu.vram_gb);
      if (!quant) return null;
      const qualityScore: Record<Quantization, number> = {
        fp16: 6,
        q8: 5,
        q6: 4,
        q5: 3,
        q4: 2,
        q3: 1,
      };
      // image_gen: additive with size boost (FLUX beats SDXL on 12+ GB GPUs)
      // LLMs: multiplicative — naturally scales larger models at good quants over tiny fp16 models
      const score =
        goal === "image_gen"
          ? qualityScore[quant] * 10 + Math.min(m.params_b, 70) * 3
          : qualityScore[quant] * Math.min(m.params_b, 70);
      return { model: m, score };
    })
    .filter((x): x is { model: LLMModel; score: number } => x !== null)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.model ?? models.find((m) => m.use_cases.includes(goal)) ?? models[0];
}

function buildOption(
  tier: RecommendationOption["tier"],
  gpu: GPU,
  goal: UseCase,
  models: LLMModel[]
): RecommendationOption {
  const model = pickBestModel(gpu, goal, models);
  const quant = bestQuantForVram(model.params_b, gpu.vram_gb) ?? "q4";
  const vram_required_gb = Math.round(calcVram(model.params_b, quant) * 10) / 10;
  return {
    tier,
    gpu,
    model,
    quantization: quant,
    vram_required_gb,
    vram_fits: vram_required_gb <= gpu.vram_gb,
    ollama_command: ollamaTag(model.id, quant),
    setup_notes: setupNotes(gpu, quant, goal),
  };
}

export class HardwareAdvisor {
  recommend(input: UserInput): Recommendation {
    const affordable = filterByBudget(ALL_GPUS, input.budget_eur);
    const pool = affordable.length > 0 ? affordable : ALL_GPUS;

    // Budget: cheapest GPU within budget
    const budgetGpu = [...pool].sort((a, b) => a.price_eur - b.price_eur)[0];

    // Best value: highest VRAM/€ ratio
    const bestValueGpu = sortByValue(pool)[0];

    // Overkill: most VRAM within budget
    const overkillGpu = [...pool].sort((a, b) => b.vram_gb - a.vram_gb)[0];

    const options: RecommendationOption[] = [
      buildOption("budget", budgetGpu, input.goal, ALL_MODELS),
    ];

    if (bestValueGpu.id !== budgetGpu.id) {
      options.push(buildOption("best_value", bestValueGpu, input.goal, ALL_MODELS));
    } else {
      // Same GPU — show it again as best_value with budget label omitted,
      // or pick next-best-value GPU if one exists
      const nextBest = sortByValue(pool)[1];
      const gpuToUse = nextBest ?? bestValueGpu;
      options.push(buildOption("best_value", gpuToUse, input.goal, ALL_MODELS));
    }

    if (overkillGpu.id !== bestValueGpu.id && overkillGpu.id !== budgetGpu.id) {
      options.push(buildOption("overkill", overkillGpu, input.goal, ALL_MODELS));
    } else {
      // Try to find a higher-VRAM GPU from the full list (ignoring budget)
      const uncapped = [...ALL_GPUS].sort((a, b) => b.vram_gb - a.vram_gb);
      const overkillFallback =
        uncapped.find((g) => g.id !== bestValueGpu.id && g.id !== budgetGpu.id) ?? uncapped[0];
      options.push(buildOption("overkill", overkillFallback, input.goal, ALL_MODELS));
    }

    return { user_input: input, options };
  }
}
