type StyleIterator = (name: string, value: string, result: Record<string, string>) => void | null;

export default function styleToObject(style: string, iterator?: StyleIterator): Record<string, string> {
  const result: Record<string, string> = {};
  const raw = String(style || '').trim();
  if (!raw) return result;

  raw.split(';').forEach((chunk) => {
    const part = chunk.trim();
    if (!part) return;
    const idx = part.indexOf(':');
    if (idx <= 0) return;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!name) return;
    if (iterator) {
      const res = iterator(name, value, result);
      if (res === null) return;
    }
    result[name] = value;
  });

  return result;
}
