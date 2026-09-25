/**
 * Icône au trait Lucide, 20 px et 1,5 px d'épaisseur par défaut, en currentColor.
 * Toujours accompagnée d'un libellé : une cliente ne devine pas une icône seule.
 */
export interface IconProps {
  /** Nom Lucide en kebab-case, ex. "upload-cloud", "image", "trash-2". */
  name: string;
  /** Côté en px. 20 dans l'interface, 16 dans les libellés compacts. */
  size?: number;
  /** Épaisseur du trait. 1,5 par défaut. */
  strokeWidth?: number;
  style?: React.CSSProperties;
}
export declare function Icon(props: IconProps): JSX.Element;
