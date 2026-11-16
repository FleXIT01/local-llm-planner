import { copyFileSync, cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

mkdirSync(new URL("../dist/data/", import.meta.url), { recursive: true });
copyFileSync(
  new URL("../src/data/presets.json", import.meta.url),
  new URL("../dist/data/presets.json", import.meta.url)
);
cpSync(
  new URL("../src/web/public", import.meta.url),
  new URL("../dist/web/public", import.meta.url),
  { recursive: true }
);
console.log("Copied runtime assets (presets.json, public/) into dist/");
