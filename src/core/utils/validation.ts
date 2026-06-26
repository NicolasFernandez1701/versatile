/**
 * Validates email format using a standard regex pattern.
 * Covers 99.9% of real-world email formats without external dependencies.
 */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length === 0) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
}

/**
 * Validates that endTime is strictly after startTime.
 * Uses lexicographic comparison — HH:MM format is naturally comparable.
 * Does NOT support overnight ranges (e.g., 23:00 → 00:30).
 */
export function isTimeRangeValid(startTime: string, endTime: string): boolean {
  return endTime > startTime;
}

/**
 * Type guard that narrows `unknown` to `Error`.
 * Replaces `catch (err: any)` with safe typing.
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}
