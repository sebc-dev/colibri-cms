/**
 * Le colibri qui butine un nuage, aplat monochrome. Il ne se recolore pas en
 * `plumage` ni en `gorge`, ne s'étire pas, ne reçoit ni ombre ni contour.
 * Taille minimale proposée : 24 px de haut.
 */
export interface LogoProps {
  /** `light` = dessin #39362F, `dark` = #EEF1EC. Suit le thème, pas le fond de la carte. */
  theme?: 'light' | 'dark';
  /** Hauteur du dessin en px ; 24 minimum. Le nom fait height / 1,6. */
  height?: number;
  /** Affiche « Colibri CMS » en Fraunces 600 à droite du dessin. */
  withName?: boolean;
  /** Préfixe de chemin vers `assets/`, ex. "../../" depuis un sous-dossier. */
  assetBase?: string;
  style?: React.CSSProperties;
}
export declare function Logo(props: LogoProps): JSX.Element;
