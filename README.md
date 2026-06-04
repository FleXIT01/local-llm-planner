# local-llm-planner

A 4-step web wizard that recommends the right GPU and LLM model for running AI locally — based on your goal, budget, and existing hardware.

## What it does

| Step | What you enter |
|------|---------------|
| 1 | **Goal** — Chat, Coding, Image Gen, or Multi-Modal |
| 2 | **Budget** — your max spend in EUR (slider) |
| 3 | **Hardware** — CPU, RAM, and any existing GPU |
| 4 | **Recommendation** — three tiers: Budget / Best Value / Overkill |

Each recommendation shows:
- The recommended GPU with price and TDP
- The best LLM model that fits in VRAM at the highest possible quantization
- A visual VRAM bar: `[===========------] 11.2 GB / 16 GB` (green/yellow/red)
- A ready-to-run `ollama pull` command with one-click copy
- Setup notes (ROCm on AMD, SYCL on Intel, NVLink for multi-GPU, etc.)
- A shareable URL hash encoding the full config

## Quick start

**With Python (recommended):**
```bash
python run.py          # auto-install + start server
python run.py test     # run unit tests
python run.py build    # compile TypeScript
python run.py all      # install + test + build + start
```

**With npm directly:**
```bash
npm install
npm run dev       # http://localhost:3000
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Wizard UI |
| `POST` | `/api/recommend` | Get 3-tier hardware recommendation |
| `GET` | `/api/presets` | 6 predefined setup presets |

### POST /api/recommend

```json
{
  "goal": "coding",
  "budget_eur": 800,
  "existing_cpu": "i7-12700K",
  "existing_ram_gb": 32,
  "existing_gpu_id": "rtx4060"
}
```

### GET /api/presets

Returns an array of 6 curated setups: Student Budget, Developer Starter, Power User, Multi-GPU Lab, Mac Setup, Used Market Deal.

## GPU database (37 GPUs)

### Consumer Desktop

| GPU | VRAM | Price | Notes |
|-----|------|-------|-------|
| Intel Arc B570 | 10 GB | ~€250 | SYCL/XPU, best on Linux |
| Intel Arc B580 | 12 GB | ~€285 | SYCL/XPU, 12GB budget |
| RTX 4060 | 8 GB | ~€280 | Entry NVIDIA Ada |
| RTX 5060 | 8 GB | ~€315 | Blackwell, GDDR7 |
| RX 9060 XT 8GB | 8 GB | ~€355 | RDNA 4 entry |
| RX 9060 XT 16GB | 16 GB | ~€385 | RDNA 4 value |
| RTX 5060 Ti 8GB | 8 GB | ~€420 | Blackwell mid |
| RTX 4060 Ti 16GB | 16 GB | ~€450 | Ada 16GB value |
| RTX 5060 Ti 16GB | 16 GB | ~€460 | Blackwell 16GB |
| RX 9070 | 16 GB | ~€480 | RDNA 4 mid, ROCm |
| RTX 4070 Super | 12 GB | ~€520 | Ada mid-range |
| RTX 4070 | 12 GB | ~€550 | Ada solid all-rounder |
| RX 9070 XT | 16 GB | ~€580 | RDNA 4 upper mid |
| RTX 3090 (used) | 24 GB | ~€600 | Used king for 24GB |
| RTX 5070 | 12 GB | ~€650 | Blackwell mid |
| RTX 4070 Ti Super | 16 GB | ~€780 | Ada high-end 16GB |
| RX 7900 XTX | 24 GB | ~€900 | 24GB AMD value |
| RTX 4080 Super | 16 GB | ~€1 000 | Ada high-end |
| RTX 5070 Ti | 16 GB | ~€900 | Blackwell upper |
| RTX 4090 | 24 GB | ~€1 800 | Ada flagship |
| RTX 5080 | 16 GB | ~€1 350 | Blackwell high-end |
| RTX 5090 | 32 GB | ~€2 400 | Blackwell flagship |
| 2× RTX 3090 (used) | 48 GB | ~€1 200 | NVLink multi-GPU |

### Workstation / Pro

| GPU | VRAM | Price | Notes |
|-----|------|-------|-------|
| RTX 4000 Ada | 20 GB | ~€1 200 | Low-power ECC workstation |
| RTX 4500 Ada | 24 GB | ~€2 000 | Workstation 24GB ECC |
| Radeon Pro W7800 | 32 GB | ~€2 500 | AMD workstation 32GB |
| RTX 5000 Ada | 32 GB | ~€3 200 | Workstation 32GB ECC |
| Radeon Pro W7900 | 48 GB | ~€3 800 | AMD workstation 48GB |
| RTX A6000 | 48 GB | ~€5 500 | Previous-gen 48GB |
| RTX 6000 Ada | 48 GB | ~€7 000 | Flagship workstation |

### Server / Data Center

| GPU | VRAM | Price | Notes |
|-----|------|-------|-------|
| NVIDIA L40S | 48 GB | ~€10 000 | AI inference server |
| NVIDIA A100 40GB | 40 GB | ~€8 000 | Data center HBM2e |
| NVIDIA A100 80GB | 80 GB | ~€15 000 | Data center standard |
| NVIDIA H100 80GB | 80 GB | ~€25 000 | Cloud/HPC only |
| AMD Instinct MI300X | 192 GB | ~€20 000 | 192GB HBM3 |

### Apple Silicon

| Config | VRAM | Price | Notes |
|--------|------|-------|-------|
| Mac M4 Max 128GB | 128 GB | ~€3 500 | Unified memory, Metal |
| Mac M3 Ultra 192GB | 192 GB | ~€5 000 | Unified memory, Metal |

## VRAM formula

```
vram_gb = (params_b × bits_per_weight) / 8 × 1.2
```

The `× 1.2` overhead accounts for KV-cache and runtime. Quantization bits:  
`fp16=16 · q8=8 · q6=6 · q5=5 · q4=4 · q3=3`

Example: Llama 3.3 70B at Q4 = `(70 × 4) / 8 × 1.2 = 42 GB`

## Scripts

```bash
# Python launcher (no need to remember npm commands)
python run.py          # auto-install + start server
python run.py dev      # start dev server
python run.py test     # run unit tests
python run.py build    # compile TypeScript
python run.py install  # npm install only
python run.py all      # install + test + build + start

# npm directly
npm run dev       # tsx dev server, hot reload
npm run build     # tsc -> dist/
npm test          # vitest unit tests
npm run lint      # biome check src/
npm run format    # biome format --write src/
```

## Project structure

```
run.py                          # Python launcher (start / test / build)
src/
├── types/index.ts              # GPU, LLMModel, UserInput, Recommendation, Preset
├── data/
│   ├── gpus.json               # 37 GPUs -- desktop, workstation, server, Apple
│   ├── models.json             # 12 LLM models
│   └── presets.json            # 6 curated setup presets
├── advisor/
│   ├── vramCalculator.ts       # pure VRAM math (tested)
│   ├── budgetFilter.ts         # filter + sort by budget/value
│   └── HardwareAdvisor.ts      # 3-tier recommendation engine
├── web/
│   ├── server.ts               # Hono app factory
│   ├── routes/
│   │   ├── advisor.ts          # POST /api/recommend
│   │   └── presets.ts          # GET /api/presets
│   └── public/index.html       # single-file Vanilla JS wizard SPA
└── index.ts
tests/
└── vramCalculator.test.ts      # 12 unit tests
```

## License

MIT
