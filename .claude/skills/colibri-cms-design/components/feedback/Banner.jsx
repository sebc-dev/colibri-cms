import React from 'react';
import { Icon } from '../core/Icon.jsx';

const cbBannerTones = {
  gorge:  { fg: 'var(--gorge)',  bg: 'var(--gorge-soft)',  icon: 'circle-dot' },
  info:   { fg: 'var(--info)',   bg: 'var(--info-soft)',   icon: 'refresh-cw' },
  plumage:{ fg: 'var(--plumage)',bg: 'var(--plumage-soft)',icon: 'check' },
  ambre:  { fg: 'var(--ambre)',  bg: 'var(--ambre-soft)',  icon: 'triangle-alert' },
  danger: { fg: 'var(--danger)', bg: 'var(--danger-soft)', icon: 'circle-alert' },
};

export function Banner({ tone = 'gorge', title, children, actions, icon, style }) {
  const t = cbBannerTones[tone];
  return (
    <div role="status" style={{
      display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
      background: t.bg, borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', ...style,
    }}>
      <span style={{ color: t.fg, display: 'flex', paddingTop: 2 }}><Icon name={icon || t.icon} size={18} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--body-size)', lineHeight: 'var(--body-line)', fontWeight: 600, color: t.fg }}>{title}</p>}
        {children && <div style={{ margin: title ? 'var(--space-1) 0 0' : 0, fontSize: 'var(--body-size)', lineHeight: 'var(--body-line)', color: 'var(--ink)' }}>{children}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 'var(--space-2)', flex: '0 0 auto' }}>{actions}</div>}
    </div>
  );
}
