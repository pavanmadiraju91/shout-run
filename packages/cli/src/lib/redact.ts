import { readFileSync } from 'node:fs';
import { StreamRedactor } from '@shout/shared';
import { collectSensitiveValues } from './env.js';

// Re-export the core class so existing CLI imports don't break
export { StreamRedactor } from '@shout/shared';

/**
 * CLI-specific extension: create a StreamRedactor pre-loaded with
 * sensitive env var values and optional .env file secrets.
 */
export function createCliRedactor(options: {
  env?: Record<string, string | undefined>;
  redactFile?: string;
  redactValues?: string[];
}): StreamRedactor {
  const redactor = new StreamRedactor();

  if (options.env) {
    for (const val of collectSensitiveValues(options.env)) {
      redactor.addSecret(val);
    }
  }

  if (options.redactFile) {
    loadSecretsFromFile(redactor, options.redactFile);
  }

  if (options.redactValues) {
    for (const val of options.redactValues) {
      redactor.addSecret(val);
    }
  }

  return redactor;
}

/**
 * Parse a .env file and add all values as secrets.
 * Supports KEY=value, KEY="value", KEY='value', and # comments.
 */
function loadSecretsFromFile(redactor: StreamRedactor, filePath: string): void {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return; // file not found or unreadable — silently skip
  }
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    redactor.addSecret(val);
  }
}
