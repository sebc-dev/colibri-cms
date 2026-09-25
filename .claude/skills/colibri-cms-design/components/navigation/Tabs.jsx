import React from 'react';

export function Tabs({ items = [], value, onChange, style }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 'var(--space-4)', borderBottom: 'var(--border-width) solid var(--line)', ...style }}>
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button key={it.value} role="tab" aria-selected={on} type="button" onClick={() => onChange && onChange(it.value)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-2) 0',
              marginBottom: -1, borderBottom: '2px solid ' + (on ? 'var(--plumage)' : 'transparent'),
              fontFamily: 'var(--font-sans)', fontSize: 'var(--label-size)', lineHeight: 'var(--label-line)',
              letterSpacing: 'var(--label-tracking)', fontWeight: on ? 600 : 500,
              color: on ? 'var(--plumage)' : 'var(--ink-muted)',
            }}>
            {it.label}
            {it.count != null && <span style={{ marginLeft: 'var(--space-1)', color: 'var(--ink-muted)', fontWeight: 400 }}>{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
