export function normalizeError(err: unknown): { message: string; stack?: string } {
  try {
    if (!err) return { message: 'Unknown error' };
    if (typeof err === 'string') return { message: err };
    if (err instanceof Error) return { message: err.message || 'Error', stack: err.stack };
    const anyErr = err as any;
    if (anyErr?.message && typeof anyErr.message === 'string') return { message: anyErr.message };
    if (anyErr?.error?.message && typeof anyErr.error.message === 'string') return { message: anyErr.error.message };
    return { message: JSON.stringify(err) };
  } catch {
    return { message: 'Unknown error (failed to normalize)' };
  }
}