/**
 * Enveloppe d'un champ : étiquette `label`, aide ou message d'erreur en `caption`.
 * Le caractère obligatoire s'écrit en toutes lettres, jamais avec un astérisque.
 */
export interface FieldProps {
  label?: React.ReactNode;
  /** `id` du champ contrôlé, pour lier l'étiquette. */
  htmlFor?: string;
  /** Aide sous le champ, en `ink-muted`. Masquée si `error` est présent. */
  help?: React.ReactNode;
  /** Message d'erreur en `danger`, phrase complète. */
  error?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Field(props: FieldProps): JSX.Element;
