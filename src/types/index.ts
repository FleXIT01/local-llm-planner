export type Manufacturer = "nvidia" | "amd" | "apple" | "intel";
export type Quantization = "fp16" | "q8" | "q6" | "q5" | "q4" | "q3";
export type UseCase = "chat" | "coding" | "image_gen" | "multimodal";

export interface GPU {
  id: string;
  name: string;
  vram_gb: number;
  price_eur: number;
  tdp_watt: number;
  manufacturer: Manufacturer;
  notes: string;
}

export interface LLMModel {
  id: string;
  name: string;
  params_b: number;
  use_cases: UseCase[];
  min_vram_q4_gb: number;
  min_vram_q8_gb: number;
  context_length: number;
  description: string;
}

export interface UserInput {
  goal: UseCase;
  budget_eur: number;
  existing_cpu?: string;
  existing_ram_gb?: number;
  existing_gpu_id?: string;
}

export interface RecommendationOption {
  tier: "budget" | "best_value" | "overkill";
  gpu: GPU;
  model: LLMModel;
  quantization: Quantization;
  vram_required_gb: number;
  vram_fits: boolean;
  ollama_command: string;
  setup_notes: string[];
}

export interface Recommendation {
  user_input: UserInput;
  options: RecommendationOption[];
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  gpu_id: string;
  recommended_models: string[];
  setup_notes: string[];
}
