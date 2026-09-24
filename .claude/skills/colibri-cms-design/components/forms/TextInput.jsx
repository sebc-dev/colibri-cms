import React from 'react';
const cbControl = {
  width: '100%', fontFamily: 'var(--font-sans)', fontSize: 'var(--body-size)', lineHeight: 'var(--body-line)',
  color: 'var(--ink)', background: 'var(--surface-raised)',
  border: 'var(--border-width) solid var(--line-strong)', borderRadius: 'var(--radius-sm)',
  padding: 'var(--space-3)', transition: 'border-color var(--transition-fast)',
};

export function TextInput({ id, value, onChange, placeholder, type = 'text', mono = false, invalid = false, disabled = false, readOnly = false, prefix, style, ...rest }) {
  const input = (
    <input
      id={id} type={type} value={value} placeholder={placeholder} disabled={disabled} readOnly={readOnly}
      onChange={(e) => onChange && onChange(e.target.value, e)}
      style={{
        ...cbControl,
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        fontSize: mono ? 'var(--code-size)' : 'var(--body-size)',
        minHeight: 'var(--control-height)',
        borderColor: invalid ? 'var(--danger)' : 'var(--line-strong)',
        background: disabled || readOnly ? 'var(--surface-sunken)' : 'var(--surface-raised)',
        color: disabled ? 'var(--ink-muted)' : 'var(--ink)',
        paddingLeft: prefix ? 'var(--space-2)' : 'var(--space-3)',
        border: prefix ? 'none' : undefined,
        ...(prefix ? {} : style),
      }}
      {...rest}
    />
  );
  if (!prefix) return input;
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: 'var(--border-width) solid ' + (invalid ? 'var(--danger)' : 'var(--line-strong)'), borderRadius: 'var(--radius-sm)', background: 'var(--surface-raised)', overflow: 'hidden', ...style }}>
      <span style={{ padding: '0 0 0 var(--space-3)', fontFamily: 'var(--font-mono)', fontSize: 'var(--code-size)', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>{prefix}</span>
      {input}
    </div>
  );
}
