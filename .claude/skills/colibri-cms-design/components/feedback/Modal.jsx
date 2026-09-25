import React from 'react';

export function Modal({ open = true, title, description, actions, tone = 'neutral', onClose, children, style }) {
  if (!open) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--overlay)', display: 'grid', placeItems: 'center', padding: 'var(--space-6)', zIndex: 40 }} onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-raised)', padding: 'var(--panel-padding)',
          width: 'min(440px, 100%)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', ...style,
        }}>
        {title && <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--title-size)', lineHeight: 'var(--title-line)', fontWeight: 600, letterSpacing: 'var(--title-tracking)', color: tone === 'danger' ? 'var(--danger)' : 'var(--ink)' }}>{title}</h2>}
        {description && <p style={{ margin: 0, fontSize: 'var(--body-size)', lineHeight: 'var(--body-line)', color: 'var(--ink)' }}>{description}</p>}
        {children}
        {actions && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>{actions}</div>}
      </div>
    </div>
  );
}
