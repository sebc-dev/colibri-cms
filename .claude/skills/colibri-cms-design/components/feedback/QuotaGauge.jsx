import React from 'react';

export function QuotaGauge({ label, value = 0, max = 100, remainingText, unit = '', style }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tone = pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--ambre)' : 'var(--plumage)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--label-size)', lineHeight: 'var(--label-line)', fontWeight: 'var(--label-weight)', color: 'var(--ink)' }}>{label}</span>
        <span style={{ fontSize: 'var(--caption-size)', lineHeight: 'var(--caption-line)', color: pct >= 80 ? tone : 'var(--ink-muted)' }}>{value} / {max}{unit ? ' ' + unit : ''}</span>
      </div>
      <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}
        style={{ height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--surface-sunken)', overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', borderRadius: 'var(--radius-pill)', background: tone, transition: 'width var(--transition-base)' }} />
      </div>
      {remainingText && <p style={{ margin: 0, fontSize: 'var(--caption-size)', lineHeight: 'var(--caption-line)', color: pct >= 80 ? tone : 'var(--ink-muted)' }}>{remainingText}</p>}
    </div>
  );
}
