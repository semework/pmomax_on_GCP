import React from 'react';

const gold = '#f6b541';
const goldLight = '#facc6b';
const goldBorder = '#b45309';

export function ToggleButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? gold : goldLight,
        color: '#000',
        border: `1px solid ${goldBorder}`,
        padding: '6px 10px',
        borderRadius: 6,
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: active ? '0 2px 8px #0002' : '0 1px 2px #0001',
      }}
    >
      {children}
    </button>
  );
}
