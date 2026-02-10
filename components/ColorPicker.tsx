import React from 'react';

export const ColorPicker: React.FC<{
  value: string;
  onChange: (color: string) => void;
  label?: string;
}> = ({ value, onChange, label }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    {label && <span style={{ fontWeight: 600, fontSize: 12 }}>{label}</span>}
    <input
      type="color"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer' }}
      aria-label={label || 'Pick color'}
    />
    <span style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>{value}</span>
  </label>
);
