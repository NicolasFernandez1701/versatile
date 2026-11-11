/**
 * Extracts a human-readable message from anything that can be thrown.
 *
 * Supabase returns PostgrestError as a plain object literal, not an Error
 * subclass, so `error instanceof Error` is false and the real database message
 * (e.g. 'null value in column "studio_id"') gets replaced by a generic fallback.
 * That hides the cause of every failed write in the UI.
 */
interface ErrorLike {
  message?: unknown;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  if (error !== null && typeof error === 'object') {
    const { message } = error as ErrorLike;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}
