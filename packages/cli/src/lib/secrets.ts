import { createRequire } from 'node:module';
import type { SecretPattern, SecretMatch, SecretConfidence } from '@shout/shared';

const require = createRequire(import.meta.url);
const secretPatterns: SecretPattern[] = require('../patterns/secrets.json');

interface CompiledPattern {
  name: string;
  regex: RegExp;
  confidence: SecretConfidence;
  replacement: string;
}

const compiledPatterns: CompiledPattern[] = secretPatterns.map((p: SecretPattern & { flags?: string }) => ({
  name: p.name,
  regex: new RegExp(p.pattern, p.flags ?? 'g'),
  confidence: p.confidence,
  replacement: p.replacement,
}));

/**
 * Calculate Shannon entropy of a string.
 * Higher entropy indicates more randomness (likely a secret).
 */
function shannonEntropy(str: string): number {
  if (str.length === 0) return 0;

  const freq = new Map<string, number>();
  for (const char of str) {
    freq.set(char, (freq.get(char) ?? 0) + 1);
  }

  let entropy = 0;
  const len = str.length;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Check if a string looks like a high-entropy secret.
 * Must be at least 20 chars with entropy > 3.5.
 */
function isHighEntropyString(str: string): boolean {
  if (str.length < 20) return false;
  // Skip if it looks like a path or URL
  if (str.includes('/') && str.includes('.')) return false;
  // Skip if mostly whitespace
  if (str.trim().length < str.length * 0.8) return false;
  // Skip common non-secrets
  if (/^[a-z]+$/i.test(str)) return false;
  if (/^\d+$/.test(str)) return false;

  return shannonEntropy(str) > 3.5;
}

/**
 * Find high-entropy strings that could be secrets.
 */
function findHighEntropySecrets(input: string): SecretMatch[] {
  const matches: SecretMatch[] = [];
  // Look for quoted strings or continuous alphanumeric sequences
  const potentialSecrets = /["'][A-Za-z0-9_+/=-]{20,}["']|(?<![A-Za-z0-9_])[A-Za-z0-9_+/=-]{20,}(?![A-Za-z0-9_])/g;

  let match: RegExpExecArray | null;
  while ((match = potentialSecrets.exec(input)) !== null) {
    const value = match[0].replace(/^["']|["']$/g, '');
    if (isHighEntropyString(value)) {
      // Make sure this wasn't already matched by a high-confidence pattern
      matches.push({
        name: 'High-entropy string',
        start: match.index,
        end: match.index + match[0].length,
        confidence: 'medium',
      });
    }
  }

  return matches;
}

export interface RedactResult {
  output: string;
  matches: SecretMatch[];
}

/**
 * Detect and redact secrets from input.
 * Two-tier detection:
 * 1. High confidence: structural patterns (AKIA..., ghp_..., etc.)
 * 2. Medium confidence: high-entropy strings
 */
export function redactSecrets(input: string): RedactResult {
  const allMatches: SecretMatch[] = [];
  let output = input;

  // First pass: high-confidence structural patterns
  for (const pattern of compiledPatterns) {
    // Reset regex state
    pattern.regex.lastIndex = 0;

    let match: RegExpExecArray | null;
    const replacements: Array<{ start: number; end: number; replacement: string }> = [];

    while ((match = pattern.regex.exec(input)) !== null) {
      allMatches.push({
        name: pattern.name,
        start: match.index,
        end: match.index + match[0].length,
        confidence: pattern.confidence,
      });
      replacements.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: pattern.replacement,
      });
    }

    // Apply replacements in reverse order to preserve indices
    for (const r of replacements.sort((a, b) => b.start - a.start)) {
      output = output.slice(0, r.start) + r.replacement + output.slice(r.end);
    }
  }

  // Second pass: high-entropy strings (only if not already matched)
  const entropyMatches = findHighEntropySecrets(input);
  for (const entropyMatch of entropyMatches) {
    // Check if this region was already matched by a pattern
    const overlaps = allMatches.some(
      (m) =>
        (entropyMatch.start >= m.start && entropyMatch.start < m.end) ||
        (entropyMatch.end > m.start && entropyMatch.end <= m.end) ||
        (entropyMatch.start <= m.start && entropyMatch.end >= m.end),
    );

    if (!overlaps) {
      allMatches.push(entropyMatch);
      // Find current position after previous replacements
      const originalText = input.slice(entropyMatch.start, entropyMatch.end);
      const currentIndex = output.indexOf(originalText);
      if (currentIndex !== -1) {
        output =
          output.slice(0, currentIndex) +
          '***REDACTED***' +
          output.slice(currentIndex + originalText.length);
      }
    }
  }

  return { output, matches: allMatches };
}

export { shannonEntropy };
