/**
 * Bandeau global d'état : modifications en attente (`gorge`), publication en
 * cours (`info`), publication réussie (`plumage`), quota proche (`ambre`),
 * échec (`danger`). Pas d'ombre, pas de bordure : un fond `-soft` suffit.
 */
export interface BannerProps {
  tone?: 'gorge' | 'info' | 'plumage' | 'ambre' | 'danger';
  /** Phrase courte, sans point d'exclamation. */
  title?: React.ReactNode;
  /** Détail : délai attendu, garantie que rien n'est perdu. */
  children?: React.ReactNode;
  /** Boutons alignés à droite (« Publier », « Réessayer »). */
  actions?: React.ReactNode;
  /** Nom d'icône Lucide pour remplacer celle du ton. */
  icon?: string;
  style?: React.CSSProperties;
}
export declare function Banner(props: BannerProps): JSX.Element;
