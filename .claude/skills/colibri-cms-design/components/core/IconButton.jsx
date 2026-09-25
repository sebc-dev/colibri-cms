import React from 'react';
import { Icon } from './Icon.jsx';

export function IconButton({ icon, label, variant = 'ghost', size = 'md', disabled = false, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const side = size === 'sm' ? 'var(--control-height-sm)' : 'var(--control-height)';
  const tone = {
    ghost: { background: hover && !disabled ? 'var(--surface-sunken)' : 'transparent', color: 'var(--ink)', borderColor: 'transparent' },
    outline: { background: hover && !disabled ? 'var(--surface-sunken)' : 'var(--surface-raised)', color: 'var(--ink)', borderColor: 'var(--line-strong)' },
    danger: { background: hover && !disabled ? 'var(--danger-soft)' : 'transparent', color: 'var(--danger)', borderColor: 'transparent' },
  }[variant];
  return (
    <button
      type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: side, height: side, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius-md)', border: 'var(--border-width) solid ' + tone.borderColor,
        background: tone.background, color: tone.color, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1, transition: 'background var(--transition-fast)', padding: 0, ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? 16 : 20} />
    </button>
  );
}
