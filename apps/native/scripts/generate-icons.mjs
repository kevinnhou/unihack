/**
 * Generates icon.png and splash-icon.png from agon-icon.svg
 * Run from apps/native/: bun scripts/generate-icons.mjs
 *
 * Requires: bun add -d sharp
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assets = resolve(__dirname, "../assets");

const svg = resolve(assets, "agon-icon.svg");

const targets = [
  { out: resolve(assets, "images/icon.png"), size: 1024 },
  { out: resolve(assets, "images/splash-icon.png"), size: 200 },
  { out: resolve(assets, "images/favicon.png"), size: 32 },
  { out: resolve(assets, "images/android-icon-foreground.png"), size: 768 },
];

for (const { out, size } of targets) {
  await sharp(svg).resize(size, size).png().toFile(out);
  console.log(`✓ ${out} (${size}x${size})`);
}

console.log("\nDone! Rebuild your app to pick up the new icons.");
