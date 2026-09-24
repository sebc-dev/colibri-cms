/**
 * Case à cocher, rayon `radius-sm`, remplie en `plumage` quand elle est cochée.
 */
export interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onChange?: (checked: boolean, e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: React.ReactNode;
  /** Précision sous le libellé, en `caption`. */
  help?: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function Checkbox(props: CheckboxProps): JSX.Element;
