/**
 * Input sanitization functions for session data.
 */

/** Strip control characters and clamp to maxLength. */
export function sanitizeTitle(title: string, maxLength = 256): string {
  return title.replace(/[\x00-\x1f\x7f]/g, '').slice(0, maxLength);
}

/** Strip control characters and clamp to maxLength. Returns null if empty. */
export function sanitizeDescription(desc: string, maxLength = 500): string | null {
  return desc.replace(/[\x00-\x1f\x7f]/g, '').slice(0, maxLength) || null;
}

/** Clamp to maxTags tags, each maxTagLength chars. */
export function sanitizeTags(tags: string[], maxTags = 5, maxTagLength = 32): string[] {
  return tags.slice(0, maxTags).map((t) => t.slice(0, maxTagLength));
}

const VALID_VISIBILITIES = ['public', 'followers', 'private'] as const;

/** Validate visibility, defaulting to 'public'. Returns null if invalid. */
export function validateVisibility(
  v: string | undefined,
): 'public' | 'followers' | 'private' | null {
  if (!v) return 'public';
  if (VALID_VISIBILITIES.includes(v as (typeof VALID_VISIBILITIES)[number])) {
    return v as 'public' | 'followers' | 'private';
  }
  return null;
}
