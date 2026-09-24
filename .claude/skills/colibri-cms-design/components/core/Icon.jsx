import React from 'react';

/* Icône Lucide au trait. Substitution assumée : la source ne fixe aucune bibliothèque,
   Lucide correspond à la proposition (trait 1,5 px, 20 px, currentColor). */
export function Icon({ name, size = 20, strokeWidth = 1.5, style, ...rest }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const draw = () => {
      if (!ref.current || !window.lucide) return;
      ref.current.innerHTML = '';
      const i = document.createElement('i');
      i.setAttribute('data-lucide', name);
      ref.current.appendChild(i);
      window.lucide.createIcons({
        attrs: { width: size, height: size, 'stroke-width': strokeWidth },
        nameAttr: 'data-lucide',
      });
    };
    if (window.lucide) draw();
    else {
      const t = setInterval(() => { if (window.lucide) { clearInterval(t); draw(); } }, 60);
      return () => clearInterval(t);
    }
  }, [name, size, strokeWidth]);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      style={{ display: 'inline-flex', width: size, height: size, flex: '0 0 auto', color: 'currentColor', ...style }}
      {...rest}
    />
  );
}
