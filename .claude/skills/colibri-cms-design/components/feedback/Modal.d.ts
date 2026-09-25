/**
 * Modale de confirmation. Toute action irréversible passe par là et dit ce
 * qu'elle fait avant d'agir — jamais « Êtes-vous sûr ? ».
 * Rayon `radius-lg`, `shadow-raised` : elle flotte, donc elle porte une ombre.
 */
export interface ModalProps {
  open?: boolean;
  /** Question complète : "Supprimer définitivement cette photo ?" */
  title?: React.ReactNode;
  /** Conséquence : "Elle disparaîtra aussi du site." */
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** `danger` colore le titre pour une suppression définitive. */
  tone?: 'neutral' | 'danger';
  onClose?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Modal(props: ModalProps): JSX.Element;
