// Reset PID fields and assistant history
export function resetAppState(setPidData, setAssistantHistory, setParseError, setGeneralNotes) {
    setPidData(null);
    setAssistantHistory([]);
    setParseError(null);
    setGeneralNotes('');
}
