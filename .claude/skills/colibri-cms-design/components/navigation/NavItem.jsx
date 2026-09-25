import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function NavItem({ icon, label, active = false, badge, onClick, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%', textAlign: 'left',
        background: active ? 'var(--plumage-soft)' : hover ? 'var(--surface-sunken)' : 'transparent',
        color: active ? 'var(--plumage)' : 'var(--ink)',
        border: 'none', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)',
        fontFamily: 'var(--font-sans)', fontSize: 'var(--body-size)', lineHeight: 'var(--body-line)',
        fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'background var(--transition-fast)', ...style,
      }}>
      {icon && <Icon name={icon} size={20} />}
      <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
      {badge != null && (
        <span style={{ fontSize: 'var(--caption-size)', fontWeight: 500, color: 'var(--gorge)', background: 'var(--gorge-soft)', borderRadius: 'var(--radius-pill)', padding: '1px var(--space-2)' }}>{badge}</span>
      )}
    </button>
  );
}
