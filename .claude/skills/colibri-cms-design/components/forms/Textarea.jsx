import React from 'react';
const cbControl = {
  width: '100%', fontFamily: 'var(--font-sans)', fontSize: 'var(--body-size)', lineHeight: 'var(--body-line)',
  color: 'var(--ink)', background: 'var(--surface-raised)',
  border: 'var(--border-width) solid var(--line-strong)', borderRadius: 'var(--radius-sm)',
  padding: 'var(--space-3)', transition: 'border-color var(--transition-fast)',
};

export function Textarea({ id, value, onChange, placeholder, rows = 4, invalid = false, disabled = false, style, ...rest }) {
  return (
    <textarea
      id={id} value={value} placeholder={placeholder} rows={rows} disabled={disabled}
      onChange={(e) => onChange && onChange(e.target.value, e)}
      style={{
        ...cbControl, resize: 'vertical',
        borderColor: invalid ? 'var(--danger)' : 'var(--line-strong)',
        background: disabled ? 'var(--surface-sunken)' : 'var(--surface-raised)',
        ...style,
      }}
      {...rest}
    />
  );
}
