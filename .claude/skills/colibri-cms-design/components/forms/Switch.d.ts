/**
 * Interrupteur pour un réglage qui s'applique immédiatement (contrairement à la
 * case à cocher d'un formulaire qu'on enregistre). Piste `radius-pill`.
 */
export interface SwitchProps {
  id?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  help?: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function Switch(props: SwitchProps): JSX.Element;
