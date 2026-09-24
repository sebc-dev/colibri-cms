/**
 * Onglets d'une page d'édition (Contenu / Photos / Réglages) ou d'un filtre de
 * liste. Libellés en style `label`, soulignement `plumage` sur l'onglet actif.
 */
export interface TabItem { value: string; label: string; count?: number }
export interface TabsProps {
  items?: TabItem[];
  value?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}
export declare function Tabs(props: TabsProps): JSX.Element;
