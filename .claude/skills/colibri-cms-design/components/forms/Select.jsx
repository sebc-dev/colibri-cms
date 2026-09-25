import React from 'react';
const cbControl = {
  width: '100%', fontFamily: 'var(--font-sans)', fontSize: 'var(--body-size)', lineHeight: 'var(--body-line)',
  color: 'var(--ink)', background: 'var(--surface-raised)',
  border: 'var(--border-width) solid var(--line-strong)', borderRadius: 'var(--radius-sm)',
  padding: 'var(--space-3)', transition: 'border-color var(--transition-fast)',
};

export function Select({ id, value, onChange, options = [], disabled = false, invalid = false, style, ...rest }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <select
        id={id} value={value} disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.value, e)}
        style={{
          ...cbControl, minHeight: 'var(--control-height)', appearance: 'none',
          paddingRight: 'var(--space-8)',
          borderColor: invalid ? 'var(--danger)' : 'var(--line-strong)',
          background: disabled ? 'var(--surface-sunken)' : 'var(--surface-raised)',
        }}
        {...rest}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span aria-hidden="true" style={{ position: 'absolute', right: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--ink-muted)', fontSize: 11 }}>▼</span>
    </div>
  );
}
