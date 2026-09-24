/**
 * Bouton de l'administration. `primary` est plumage et ne sert qu'à l'action
 * principale d'un écran (Publier, Enregistrer) ; `danger` uniquement pour une
 * suppression définitive, toujours confirmée.
 */
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  /** Nom d'icône Lucide placée avant le libellé. */
  icon?: string;
  /** Nom d'icône Lucide placée après le libellé (chevron, lien externe). */
  iconEnd?: string;
  disabled?: boolean;
  /** Affiche l'icône d'attente et bloque le clic. */
  loading?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
