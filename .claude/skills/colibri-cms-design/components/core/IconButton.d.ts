/**
 * Bouton carré réduit à une icône, pour les actions secondaires d'une ligne ou
 * d'une vignette. `label` est obligatoire : il sert d'infobulle et de nom accessible.
 */
export interface IconButtonProps {
  /** Nom d'icône Lucide. */
  icon: string;
  /** Libellé accessible et infobulle, ex. "Supprimer la photo". */
  label: string;
  variant?: 'ghost' | 'outline' | 'danger';
  size?: 'md' | 'sm';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
