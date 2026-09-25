/**
 * Entrée de la navigation latérale de l'administration. L'élément actif est en
 * `plumage` sur `plumage-soft` ; le compteur est en `gorge` (non publié).
 */
export interface NavItemProps {
  /** Nom d'icône Lucide, 20 px. */
  icon?: string;
  label: React.ReactNode;
  active?: boolean;
  /** Compteur de modifications non publiées ou de demandes non lues. */
  badge?: number | string;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function NavItem(props: NavItemProps): JSX.Element;
