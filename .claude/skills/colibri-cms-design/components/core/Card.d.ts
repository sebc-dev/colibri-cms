/**
 * Carte de contenu : filet `line`, jamais d'ombre. L'ombre est réservée à ce
 * qui flotte (menus, modales).
 */
export interface CardProps {
  /** Titre de section, rendu en style `heading`. */
  title?: React.ReactNode;
  /** Métadonnée sous le titre, en `caption` / `ink-muted`. */
  meta?: React.ReactNode;
  /** Boutons alignés à droite du titre. */
  actions?: React.ReactNode;
  /** Rembourrage ; `var(--space-4)` par défaut, `var(--space-6)` pour un panneau. */
  padding?: string;
  /** Fond `surface-sunken` : journal, champ en lecture seule. */
  inset?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Card(props: CardProps): JSX.Element;
