/**
 * Champ de saisie sur une ligne. Bordure `line-strong` (3:1), rayon `radius-sm`.
 * `mono` pour une adresse de page, seul cas où JetBrains Mono entre dans un champ.
 */
export interface TextInputProps {
  id?: string;
  value?: string;
  onChange?: (value: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'url' | 'tel' | 'search';
  /** Rend la saisie en JetBrains Mono (adresses de pages). */
  mono?: boolean;
  /** Bordure `danger` ; le message va dans `Field.error`. */
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** Texte fixe collé devant la saisie, ex. "monsite.fr". */
  prefix?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function TextInput(props: TextInputProps): JSX.Element;
