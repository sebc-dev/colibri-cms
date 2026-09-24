/**
 * Zone de texte multi-lignes (description d'une page, message d'une demande de devis).
 */
export interface TextareaProps {
  id?: string;
  value?: string;
  onChange?: (value: string, e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  invalid?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function Textarea(props: TextareaProps): JSX.Element;
