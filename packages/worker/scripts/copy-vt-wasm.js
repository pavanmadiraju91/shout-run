/**
 * Copies wasm-pack build output from packages/vt-wasm/pkg/ into
 * packages/worker/src/lib/vt-wasm/ so wrangler can bundle the WASM.
 */
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, '../../vt-wasm/pkg');
const dest = resolve(__dirname, '../src/lib/vt-wasm');

if (!existsSync(src)) {
  console.error(`vt-wasm pkg not found at ${src} — run "pnpm --filter @shout/vt-wasm build" first`);
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`Copied vt-wasm WASM artifacts to ${dest}`);
