import React from 'react';
import { Icon } from './Icon.jsx';

const cbBtnBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
  fontFamily: 'var(--font-sans)', fontSize: 'var(--body-size)', lineHeight: 'var(--body-line)',
  fontWeight: 'var(--body-strong-weight)', borderRadius: 'var(--radius-md)',
  border: 'var(--border-width) solid transparent', cursor: 'pointer',
  transition: 'background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast)',
  textDecoration: 'none', whiteSpace: 'nowrap',
};

const cbBtnSizes = {
  md: { minHeight: 'var(--control-height)', padding: '0 var(--space-4)' },
  sm: { minHeight: 'var(--control-height-sm)', padding: '0 var(--space-3)', fontSize: 'var(--label-size)' },
};

const cbBtnVariants = {
  primary: { background: 'var(--plumage)', color: 'var(--on-plumage)' },
  secondary: { background: 'var(--surface-raised)', color: 'var(--ink)', borderColor: 'var(--line-strong)' },
  ghost: { background: 'transparent', color: 'var(--ink)' },
  danger: { background: 'var(--danger)', color: 'var(--on-danger)' },
};

export function Button({
  variant = 'primary', size = 'md', icon, iconEnd, disabled = false, loading = false,
  fullWidth = false, type = 'button', children, style, onClick, ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const off = disabled || loading;
  const s = {
    ...cbBtnBase, ...cbBtnSizes[size], ...cbBtnVariants[variant],
    width: fullWidth ? '100%' : undefined,
    opacity: off ? 0.45 : 1,
    cursor: off ? 'not-allowed' : 'pointer',
    filter: hover && !off && (variant === 'primary' || variant === 'danger') ? 'brightness(0.92)' : undefined,
    background: hover && !off && variant === 'ghost' ? 'var(--surface-sunken)'
      : hover && !off && variant === 'secondary' ? 'var(--surface-sunken)'
      : cbBtnVariants[variant].background,
    ...style,
  };
  return (
    <button
      type={type} disabled={off} onClick={off ? undefined : onClick} style={s}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} {...rest}
    >
      {loading ? <Icon name="loader" size={size === 'sm' ? 16 : 18} /> : icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      {children}
      {iconEnd ? <Icon name={iconEnd} size={size === 'sm' ? 16 : 18} /> : null}
    </button>
  );
}
