/**
 * Script to generate level JSON files for all worlds.
 * Run with: npx tsx scripts/generate-levels.ts
 */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateWorld, WORLD_PRESETS } from '../src/model/LevelGenerator';

const __dirname = dirname(fileURLToPath(import.meta.url));

for (const preset of WORLD_PRESETS) {
  const levels = generateWorld(preset);
  const outPath = resolve(__dirname, `../public/levels/world-${preset.world}.json`);
  writeFileSync(outPath, JSON.stringify(levels, null, 2) + '\n');
  console.log(`Generated world ${preset.world}: ${levels.length} levels → ${outPath}`);
}
