import React from 'react';

export const CB_STATUS = {
  publie:        { label: 'Publié',                fg: 'var(--plumage)',   bg: 'var(--plumage-soft)', dot: false },
  modifie:       { label: 'Modifié, non publié',   fg: 'var(--gorge)',     bg: 'var(--gorge-soft)',   dot: true  },
  brouillon:     { label: 'Brouillon',             fg: 'var(--ink-muted)', bg: 'var(--surface-sunken)', dot: false },
  publication:   { label: 'Publication en cours',  fg: 'var(--info)',      bg: 'var(--info-soft)',    dot: false },
  echec:         { label: 'Échec de publication',  fg: 'var(--danger)',    bg: 'var(--danger-soft)',  dot: false },
  'sans-suite':  { label: 'Sans suite',            fg: 'var(--ink-muted)', bg: 'var(--surface-sunken)', dot: false },
  'devis-envoye':{ label: 'Devis envoyé',          fg: 'var(--info)',      bg: 'var(--info-soft)',    dot: false },
  commande:      { label: 'Commande',              fg: 'var(--plumage)',   bg: 'var(--plumage-soft)', dot: false },
};

export function StatusBadge({ state, children, style }) {
  const s = CB_STATUS[state] || CB_STATUS.brouillon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)',
      fontFamily: 'var(--font-sans)', fontSize: 'var(--label-size)', lineHeight: 'var(--label-line)',
      fontWeight: 'var(--label-weight)', letterSpacing: 'var(--label-tracking)',
      color: s.fg, background: s.bg, borderRadius: 'var(--radius-pill)',
      padding: '2px var(--space-2)', whiteSpace: 'nowrap', ...style,
    }}>
      {s.dot && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 'var(--radius-pill)', background: 'var(--gorge)', display: 'block' }} />}
      {children || s.label}
    </span>
  );
}
