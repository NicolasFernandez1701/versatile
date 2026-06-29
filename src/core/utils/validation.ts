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

/**
 * Validates that a class booking action (enroll or cancel) meets the
 * minimum advance-time requirement of 1 hour before class start.
 */
export function validateBookingWindow(
  startTime: string,
  classDate: Date
): { allowed: boolean; reason?: string } {
  const now = new Date();
  const classDateTime = new Date(classDate);
  const [hours, minutes] = startTime.split(':');
  classDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

  const diffHours = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < 1.0) {
    return { allowed: false, reason: 'No podés realizar esta acción con menos de 1 hora de anticipación.' };
  }

  return { allowed: true };
}
