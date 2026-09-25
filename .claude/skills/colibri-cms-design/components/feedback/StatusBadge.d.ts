/**
 * Badge d'état, cœur du produit : la cliente doit toujours savoir si ce qu'elle
 * voit est en ligne. Couvre les cinq états de publication et les trois états
 * d'une demande de devis.
 */
export interface StatusBadgeProps {
  state:
    | 'publie' | 'modifie' | 'brouillon' | 'publication' | 'echec'
    | 'sans-suite' | 'devis-envoye' | 'commande';
  /** Remplace le libellé par défaut ; à n'utiliser que pour préciser (« Publié le 18 septembre »). */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function StatusBadge(props: StatusBadgeProps): JSX.Element;
