import clsx from 'clsx';
import React from 'react';
import { hasContent } from '../lib/utils';

export { hasContent };

interface FieldProps {
  id?: string;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Normalizes children so we never pass a “bare” JS object to the DOM.
 * - If children is a plain object → render a small JSON preview.
 * - If children is an array, we sanitize each entry.
 * - If it’s already valid JSX / text, we just pass it through.
 */
function normalizeChildren(children: React.ReactNode): React.ReactNode {
  if (children === null || children === undefined || typeof children === 'boolean') {
    return null;
  }

  // If it's an array, normalize each entry
  if (Array.isArray(children)) {
    return React.Children.map(children, (child, idx) => {
      if (child === null || child === undefined || typeof child === 'boolean') {
        return null;
      }

      // A plain JS object (like a communicationPlan row)
      if (typeof child === 'object' && !React.isValidElement(child)) {
        return (
          <pre
            key={idx}
            className="mt-1 text-xs text-zinc-300/90 whitespace-pre-wrap break-words bg-zinc-900/60 rounded border border-zinc-700/60 px-2 py-1"
          >
            {JSON.stringify(child, null, 2)}
          </pre>
        );
      }

      return child;
    });
  }

  // Single plain JS object (most likely what caused your error)
  if (typeof children === 'object' && !React.isValidElement(children)) {
    return (
      <pre className="mt-1 text-xs text-zinc-300/90 whitespace-pre-wrap break-words bg-zinc-900/60 rounded border border-zinc-700/60 px-2 py-1">
        {JSON.stringify(children, null, 2)}
      </pre>
    );
  }


  // string / number / valid JSX
    return children;
  }



export function Field({
  id,
  title,
  children,
  className,
}: FieldProps) {
  return (
    <section
      id={id}
      className={clsx(
        'mb-4 rounded-xl border-2 border-blue-400/60 bg-zinc-800/80 px-4 py-3 shadow-lg',
        'transition-colors',
        className,
      )}
      style={{ overflow: 'visible', width: '100%' }}
    >
      {title && (
        <h3 className="mb-2 text-sm font-semibold text-amber-200 tracking-wide uppercase">
          {title}
        </h3>
      )}
      {normalizeChildren(children)}
    </section>
  );
}
