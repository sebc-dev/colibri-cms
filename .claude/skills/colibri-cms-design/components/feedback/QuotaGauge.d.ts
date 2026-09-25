/**
 * Jauge du plan gratuit. Plumage jusqu'à 80 %, ambre au-delà, danger à la
 * limite. Elle parle en unités de la cliente (photos, publications ce mois-ci) ;
 * les gigaoctets et les noms de services restent à l'écran « Technique ».
 */
export interface QuotaGaugeProps {
  /** Ce qui est compté, en mots de la cliente : "Photos", "Publications ce mois-ci". */
  label: string;
  value?: number;
  max?: number;
  /** Phrase rassurante ou avertissement : "Il reste de la place pour environ 1 200 photos." */
  remainingText?: string;
  /** Unité affichée après le maximum. */
  unit?: string;
  style?: React.CSSProperties;
}
export declare function QuotaGauge(props: QuotaGaugeProps): JSX.Element;
