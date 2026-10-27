/** Les données que `demandes.astro` passe à l'îlot `EcranDemandes` (change 013, ticket 09). */
export interface Comptes {
  demandes: number;
  commandes: number;
  retirees: number;
}
export interface NombresFormulaire extends Comptes {
  id: string;
  nom: string;
}
export interface Nombres {
  site: Comptes;
  formulaires: NombresFormulaire[];
  montrerRetirees: boolean;
}
export interface LigneDemande {
  id: string;
  reception: string;
  formulaire: string;
  page: string;
  contact: string;
  prix: string | null;
  suite: string;
  libelle: string;
  courrielNonParti: boolean;
}
export interface DonneesEcranDemandes {
  nombres: Nombres;
  filtres: { id: string; nom: string; adresse: string }[];
  adresseTous: string;
  formulaire: string | null;
  /** Lues au montage sur les lignes rendues par le serveur (`data-demande`). */
  demandes: LigneDemande[];
}

