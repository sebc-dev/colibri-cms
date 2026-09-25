import React from 'react';

export function LogView({ lines = [], maxHeight = 200, style }) {
  return (
    <pre style={{
      margin: 0, background: 'var(--surface-sunken)', border: 'var(--border-width) solid var(--line)',
      borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', overflow: 'auto', maxHeight,
      fontFamily: 'var(--font-mono)', fontSize: 'var(--code-size)', lineHeight: 'var(--code-line)',
      color: 'var(--ink-muted)', whiteSpace: 'pre-wrap', ...style,
    }}>
      {lines.map((l, i) => (
        <div key={i} style={{ color: l.tone === 'danger' ? 'var(--danger)' : l.tone === 'plumage' ? 'var(--plumage)' : 'var(--ink-muted)' }}>
          {typeof l === 'string' ? l : l.text}
        </div>
      ))}
    </pre>
  );
}
