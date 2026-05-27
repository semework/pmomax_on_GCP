import React, { useState } from 'react';

export const ContactUsButton: React.FC = () => {
  const [showEmail, setShowEmail] = useState(false);

  const handleClick = () => {
    setShowEmail(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="text-xs font-semibold text-brand-accent underline underline-offset-2 hover:text-amber-300"
      >
        Contact Us
      </button>
      {showEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-brand-panel border border-brand-border px-4 py-3 text-sm text-brand-text shadow-lg max-w-sm w-full">
            <div className="font-semibold mb-1">Contact</div>
            <p className="mb-3">
              For support or questions, email{' '}
              <a
                href="mailto:andrewi@katalyststreet.com"
                className="text-brand-accent hover:text-amber-300 underline"
              >
                andrewi@katalyststreet.com
              </a>
              .
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  window.open('mailto:andrewi@katalyststreet.com', '_blank');
                }}
                className="px-3 py-1 rounded-md bg-brand-accent text-black text-xs font-semibold hover:bg-amber-300"
              >
                Open email
              </button>
              <button
                type="button"
                onClick={() => setShowEmail(false)}
                className="px-3 py-1 rounded-md border border-brand-border text-xs text-brand-muted hover:bg-brand-surface/40"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
