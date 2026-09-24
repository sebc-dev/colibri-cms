/**
 * Zone de dépôt de fichiers : fond `surface-sunken`, rayon `radius-lg`, filet
 * tireté. Passe en `plumage-soft` au survol d'un fichier, en `danger-soft`
 * quand le quota du plan gratuit bloque l'envoi.
 */
export interface DropZoneProps {
  title?: string;
  /** Aide en unités de la cliente ("JPEG ou PNG, 10 Mo au maximum par photo"). */
  help?: string;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
  /** Phrase expliquant pourquoi l'envoi est impossible ; rend la zone en danger. */
  blockedReason?: string;
  style?: React.CSSProperties;
}
export declare function DropZone(props: DropZoneProps): JSX.Element;
