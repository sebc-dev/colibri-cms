import React from 'react';

export function Switch({ id, checked = false, onChange, label, help, disabled = false, style }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', opacity: disabled ? 0.5 : 1, ...style }}>
      <button
        id={id} type="button" role="switch" aria-checked={checked} aria-label={typeof label === 'string' ? label : undefined}
        disabled={disabled} onClick={() => onChange && onChange(!checked)}
        style={{
          width: 40, height: 22, flex: '0 0 auto', borderRadius: 'var(--radius-pill)', padding: 2,
          border: 'var(--border-width) solid ' + (checked ? 'var(--plumage)' : 'var(--line-strong)'),
          background: checked ? 'var(--plumage)' : 'var(--surface-raised)',
          cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background var(--transition-fast)',
          display: 'flex', justifyContent: checked ? 'flex-end' : 'flex-start', alignItems: 'center',
        }}
      >
        <span style={{ width: 16, height: 16, borderRadius: 'var(--radius-pill)', background: checked ? 'var(--on-plumage)' : 'var(--line-strong)', display: 'block' }} />
      </button>
      {label && (
        <span>
          <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 'var(--body-size)', lineHeight: 'var(--body-line)', color: 'var(--ink)' }}>{label}</span>
          {help && <span style={{ display: 'block', fontSize: 'var(--caption-size)', lineHeight: 'var(--caption-line)', color: 'var(--ink-muted)' }}>{help}</span>}
        </span>
      )}
    </div>
  );
}
