import React from 'react';

export function Field({ label, htmlFor, help, error, required = false, optional = false, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', ...style }}>
      {label && (
        <label htmlFor={htmlFor} style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--label-size)', lineHeight: 'var(--label-line)', fontWeight: 'var(--label-weight)', letterSpacing: 'var(--label-tracking)', color: 'var(--ink)' }}>
          {label}
          {optional && <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}> — facultatif</span>}
          {required && <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}> — obligatoire</span>}
        </label>
      )}
      {children}
      {error ? (
        <p style={{ margin: 0, fontSize: 'var(--caption-size)', lineHeight: 'var(--caption-line)', color: 'var(--danger)' }}>{error}</p>
      ) : help ? (
        <p style={{ margin: 0, fontSize: 'var(--caption-size)', lineHeight: 'var(--caption-line)', color: 'var(--ink-muted)' }}>{help}</p>
      ) : null}
    </div>
  );
}
