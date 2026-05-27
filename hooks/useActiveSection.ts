import { useState, useEffect, useRef } from 'react';

/**
 * useActiveSection
 *
 * Tracks which section ID is currently in view and returns the active section id.
 * This hook is resilient to bad inputs:
 * - If sectionIds is undefined or not an array, it safely treats it as [].
 * - It disconnects and re-creates the observer whenever sectionIds or rootMargin changes.
 */
export const useActiveSection = (
  sectionIds: string[] | undefined,
  rootMargin: string = '-20% 0px -80% 0px'
) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Guard for non-browser environments (SSR, tests)
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return;
    }

    // Always work with a safe array value
    const ids = Array.isArray(sectionIds) ? sectionIds : [];

    // Disconnect any existing observer before creating a new one
    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver(
      (entries) => {
        // Find the first intersecting element to set as active
        const intersectingEntry = entries.find((entry) => entry.isIntersecting);
        if (intersectingEntry && intersectingEntry.target && intersectingEntry.target.id) {
          setActiveSection(intersectingEntry.target.id);
        }
      },
      {
        root: null,
        rootMargin,
        threshold: 0.1,
      }
    );

    const { current: currentObserver } = observer;

    // Observe each section element if it exists in the DOM
    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        currentObserver.observe(element);
      }
    });

    // Cleanup on unmount / dependency change
    return () => {
      currentObserver.disconnect();
    };
  }, [sectionIds, rootMargin]);

  return activeSection;
};
