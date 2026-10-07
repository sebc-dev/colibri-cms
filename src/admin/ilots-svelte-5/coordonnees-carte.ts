/** Une coordonnée telle que la carte Coordonnées la reçoit du serveur (ticket 06, 008-reglages-transverses). */
export interface CoordonneeCarte {
  readonly id: string;
  readonly nature: "texte" | "telephone" | "email" | "adresse";
  readonly intitule: string;
  readonly valeur: string;
}
