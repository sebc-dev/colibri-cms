import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function DropZone({ title = 'Déposez vos photos ici', help, actionLabel = 'Choisir des fichiers', onAction, disabled = false, blockedReason, style }) {
  const [over, setOver] = React.useState(false);
  const off = disabled || !!blockedReason;
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!off) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); }}
      style={{
        border: '1px dashed ' + (off ? 'var(--danger)' : over ? 'var(--plumage)' : 'var(--line-strong)'),
        borderRadius: 'var(--radius-lg)',
        background: off ? 'var(--danger-soft)' : over ? 'var(--plumage-soft)' : 'var(--surface-sunken)',
        padding: 'var(--space-8) var(--space-6)', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)',
        transition: 'background var(--transition-fast), border-color var(--transition-fast)', ...style,
      }}
    >
      <Icon name="image-plus" size={24} style={{ color: off ? 'var(--danger)' : 'var(--ink-muted)' }} />
      <p style={{ margin: 0, fontSize: 'var(--body-size)', lineHeight: 'var(--body-line)', fontWeight: 600, color: 'var(--ink)' }}>{blockedReason || title}</p>
      {help && !blockedReason && <p style={{ margin: 0, fontSize: 'var(--caption-size)', lineHeight: 'var(--caption-line)', color: 'var(--ink-muted)' }}>{help}</p>}
      {!off && (
        <button type="button" onClick={onAction} style={{ marginTop: 'var(--space-2)', background: 'var(--surface-raised)', color: 'var(--ink)', border: 'var(--border-width) solid var(--line-strong)', borderRadius: 'var(--radius-md)', minHeight: 'var(--control-height)', padding: '0 var(--space-4)', fontFamily: 'var(--font-sans)', fontSize: 'var(--body-size)', fontWeight: 600, cursor: 'pointer' }}>{actionLabel}</button>
      )}
    </div>
  );
}
