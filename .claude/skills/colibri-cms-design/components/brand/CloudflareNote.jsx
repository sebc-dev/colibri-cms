import React from 'react';

export function CloudflareNote({ text = 'Hébergé sur votre compte Cloudflare', style }) {
  return (
    <p style={{
      margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
      fontFamily: 'var(--font-sans)', fontSize: 'var(--caption-size)', lineHeight: 'var(--caption-line)',
      color: 'var(--nuage-ink)', ...style,
    }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--nuage)', flex: '0 0 auto' }} />
      {text}
    </p>
  );
}
