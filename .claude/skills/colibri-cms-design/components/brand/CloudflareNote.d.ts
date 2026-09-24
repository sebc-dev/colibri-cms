/**
 * La mention Cloudflare : pastille `nuage` de 8 px + texte `caption` en
 * `nuage-ink`. Elle figure en pied de la navigation et en tête de l'écran
 * « Technique » — c'est le seul endroit où la marque apparaît dans le parcours
 * de la cliente. Le logo officiel Cloudflare n'est pas inclus dans ce système.
 */
export interface CloudflareNoteProps {
  text?: string;
  style?: React.CSSProperties;
}
export declare function CloudflareNote(props: CloudflareNoteProps): JSX.Element;
