
// Reset PID fields and assistant history
import { PMOMaxPID } from '../types';

export function resetAppState(
  setPidData: (p: PMOMaxPID | null) => void,
  setAssistantHistory: (h: any[]) => void,
  setParseError: (e: string | null) => void,
  setGeneralNotes: (s: string) => void,
) {
  setPidData(null);
  setAssistantHistory([]);
  setParseError(null);
  setGeneralNotes('');
}
