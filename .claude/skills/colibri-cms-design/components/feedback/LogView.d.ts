/**
 * Journal technique en JetBrains Mono sur `surface-sunken`. Réservé à l'écran
 * « Technique » : le vocabulaire Cloudflare ne sort jamais de cet écran.
 */
export interface LogLine { text: string; tone?: 'muted' | 'plumage' | 'danger' }
export interface LogViewProps {
  lines?: (LogLine | string)[];
  maxHeight?: number;
  style?: React.CSSProperties;
}
export declare function LogView(props: LogViewProps): JSX.Element;
