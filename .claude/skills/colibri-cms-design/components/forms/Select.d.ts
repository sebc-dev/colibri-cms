/**
 * Liste déroulante native, habillée aux tokens. Pour un choix parmi une liste
 * fermée (état d'une demande de devis, page parente).
 */
export interface SelectOption { value: string; label: string }
export interface SelectProps {
  id?: string;
  value?: string;
  onChange?: (value: string, e: React.ChangeEvent<HTMLSelectElement>) => void;
  options?: SelectOption[];
  disabled?: boolean;
  invalid?: boolean;
  style?: React.CSSProperties;
}
export declare function Select(props: SelectProps): JSX.Element;
