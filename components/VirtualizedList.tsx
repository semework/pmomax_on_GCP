import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type VirtualizedListProps<T> = {
  items: T[];
  height: number;
  rowHeight: number;
  overscan?: number;
  className?: string;
  renderRow: (item: T, index: number) => React.ReactNode;
};

export function VirtualizedList<T>({
  items,
  height,
  rowHeight,
  overscan = 6,
  className,
  renderRow,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const rafRef = useRef<number | null>(null);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const next = e.currentTarget.scrollTop;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setScrollTop(next));
  }, []);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const totalHeight = Math.max(0, items.length * rowHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + height) / rowHeight) + overscan);

  const visibleItems = useMemo(() => items.slice(startIndex, endIndex), [items, startIndex, endIndex]);

  return (
    <div
      className={className}
      style={{ height, overflowY: 'auto', position: 'relative' }}
      onScroll={onScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, idx) => {
          const index = startIndex + idx;
          const top = index * rowHeight;
          return (
            <div key={index} style={{ position: 'absolute', top, left: 0, right: 0, height: rowHeight }}>
              {renderRow(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
