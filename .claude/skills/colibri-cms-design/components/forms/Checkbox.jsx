import React from 'react';

export function Checkbox({ id, checked = false, onChange, label, help, disabled = false, style }) {
  return (
    <label htmlFor={id} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      <span style={{ position: 'relative', display: 'inline-flex', flex: '0 0 auto', marginTop: 2 }}>
        <input
          id={id} type="checkbox" checked={checked} disabled={disabled}
          onChange={(e) => onChange && onChange(e.target.checked, e)}
          style={{ appearance: 'none', margin: 0, width: 18, height: 18, borderRadius: 'var(--radius-sm)', border: 'var(--border-width) solid ' + (checked ? 'var(--plumage)' : 'var(--line-strong)'), background: checked ? 'var(--plumage)' : 'var(--surface-raised)', cursor: 'inherit' }}
        />
        {checked && (
          <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--on-plumage)', fontSize: 12, lineHeight: 1, pointerEvents: 'none' }}>✓</span>
        )}
      </span>
      <span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--body-size)', lineHeight: 'var(--body-line)', color: 'var(--ink)' }}>{label}</span>
        {help && <span style={{ display: 'block', fontSize: 'var(--caption-size)', lineHeight: 'var(--caption-line)', color: 'var(--ink-muted)' }}>{help}</span>}
      </span>
    </label>
  );
}
