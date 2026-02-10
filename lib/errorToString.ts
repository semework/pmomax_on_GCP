import { safeErrorMessage } from './safeError';

export function errorToString(e: unknown): string {
  return safeErrorMessage(e);
}
