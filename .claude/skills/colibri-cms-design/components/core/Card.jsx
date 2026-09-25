import React from 'react';

export function Card({ title, meta, actions, padding = 'var(--card-padding)', inset = false, children, style, ...rest }) {
  return (
    <section
      style={{
        background: inset ? 'var(--surface-sunken)' : 'var(--surface-raised)',
        border: 'var(--border-width) solid var(--line)',
        borderRadius: 'var(--radius-md)', padding, ...style,
      }}
      {...rest}
    >
      {(title || actions) && (
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
          <div>
            {title && <h3 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--heading-size)', lineHeight: 'var(--heading-line)', fontWeight: 600, color: 'var(--ink)' }}>{title}</h3>}
            {meta && <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--caption-size)', lineHeight: 'var(--caption-line)', color: 'var(--ink-muted)' }}>{meta}</p>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 'var(--space-2)', flex: '0 0 auto' }}>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
