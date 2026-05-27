import { useRef, useEffect } from 'react';

/**
 * Hook to log and throttle render frequency for a component.
 * Logs a warning if renders exceed maxRendersPerSecond.
 */
export function useRenderStats(componentName: string, maxRendersPerSecond = 10) {
  const lastRender = useRef<number[]>([]);

  useEffect(() => {
    const now = Date.now();
    lastRender.current.push(now);
    // Keep only the last 20 timestamps
    if (lastRender.current.length > 20) lastRender.current.shift();
    // Count renders in the last second
    const oneSecAgo = now - 1000;
    const renders = lastRender.current.filter((t) => t > oneSecAgo).length;
    if (renders > maxRendersPerSecond) {
      // eslint-disable-next-line no-console
      console.warn(
        `[${componentName}] High render frequency: ${renders} renders in the last second.`
      );
    }
  });
}
