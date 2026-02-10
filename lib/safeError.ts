export function safeErrorMessage(err: unknown, fallback = 'Unexpected error'): string {
  try {
    if (!err) return fallback;
    if (typeof err === 'string') return err;

    if (err instanceof Error) {
      return err.message || fallback;
    }

    if (typeof err === 'object') {
      const anyErr = err as any;
      if (typeof anyErr.message === 'string' && anyErr.message.trim()) return anyErr.message;
      if (typeof anyErr.error === 'string' && anyErr.error.trim()) return anyErr.error;

      return JSON.stringify(err);
    }

    return String(err);
  } catch {
    return fallback;
  }
}
