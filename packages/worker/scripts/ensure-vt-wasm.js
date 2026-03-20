/**
 * Ensures vt-wasm files exist for tests.
 * Tries to copy real artifacts first; if the wasm package hasn't been built,
 * creates stub files so vi.mock() can intercept the imports.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dest = resolve(__dirname, '../src/lib/vt-wasm');
const src = resolve(__dirname, '../../vt-wasm/pkg');

if (existsSync(src)) {
  // Real wasm build exists — copy it
  execSync(`node ${resolve(__dirname, 'copy-vt-wasm.js')}`, { stdio: 'inherit' });
} else if (!existsSync(resolve(dest, 'vt_wasm.js'))) {
  // No real build and no prior copy — create stubs for tests
  mkdirSync(dest, { recursive: true });
  writeFileSync(resolve(dest, 'vt_wasm.js'), 'export default function(){}; export class VtParser {};\n');
  writeFileSync(resolve(dest, 'vt_wasm_bg.wasm'), '');
  console.log(`Created vt-wasm stubs at ${dest} (tests will mock these)`);
}
