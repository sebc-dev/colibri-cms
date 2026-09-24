import React from 'react';

export function Logo({ theme = 'light', height = 28, withName = true, assetBase = '', style }) {
  const src = assetBase + (theme === 'dark' ? 'assets/logo-colibri-clair.svg' : 'assets/logo-colibri.svg');
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', ...style }}>
      <img src={src} alt={withName ? '' : 'Colibri CMS'} style={{ height, width: 'auto', display: 'block' }} />
      {withName && (
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: Math.round(height / 1.6), lineHeight: 1.1, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Colibri CMS</span>
      )}
    </span>
  );
}
