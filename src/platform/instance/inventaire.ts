/**
 * Inventaire de livraison (ticket 09, ADR-0005, ADR-0035) : la liste déclarée
 * des clés et liaisons que le produit lit, confrontée à ce que la plateforme
 * observe. Fonction pure (liste + observations -> texte). Aucun champ de
 * valeur : seuls des noms entrent ici, jamais ce que ces noms désignent.
 */

export interface EntreeDeclaree {
  nom: string;
  /** Un des lieux d'ADR-0005 : liaison de déploiement, secret du compte, Workers Builds. */
  lieu: string;
  portee: string;
  gratuit: boolean;
  /** Le geste que l'absence de l'entrée refuse. */
  geste: string;
}

export const ENTREES_DECLAREES: readonly EntreeDeclaree[] = [
  {
    nom: 'DB',
    lieu: 'liaison de la configuration de déploiement',
    portee: 'Worker du site',
    gratuit: true,
    geste: "toute lecture ou écriture des pages, des réglages et des demandes",
  },
  {
    nom: 'ASSETS',
    lieu: 'liaison de la configuration de déploiement',
    portee: 'Worker du site',
    gratuit: true,
    geste: 'le service des pages publiées et des fichiers statiques',
  },
  {
    nom: 'EXPEDITEUR_CODE_CONNEXION',
    lieu: 'liaison de la configuration de déploiement',
    portee: 'Worker du site',
    gratuit: true,
    geste: "l'envoi du code de connexion à l'adresse autorisée",
  },
  {
    nom: 'JETON_DEPOT',
    lieu: 'secret du compte Cloudflare, Worker du site',
    portee: 'écriture du dépôt de publication',
    gratuit: true,
    geste: "la publication du site vers le dépôt",
  },
  {
    nom: 'JETON_ADRESSES_EMAIL',
    lieu: 'secret du compte Cloudflare, Worker du site',
    portee: 'lecture des adresses vérifiées du compte',
    gratuit: true,
    geste: "la constatation d'une adresse vérifiée par la plateforme",
  },
  {
    nom: 'COLIBRI_CLE_LECTURE_DEPOT',
    lieu: 'variable de Workers Builds',
    portee: 'lecture du dépôt à la construction',
    gratuit: true,
    geste: 'la récupération des images publiées à la construction',
  },
];

export interface Observations {
  /** Noms des secrets posés sur le Worker. */
  secretsPoses: string[];
  /** Nom de la base rattachée, ou null. */
  base: string | null;
  declencheur: string | null;
  domaine: string | null;
  /** Identifiant du client sur le dépôt. */
  client: string;
  membresDuCompte: string[];
  collaborateursDuDepot: string[];
  /** Liaisons de la configuration de déploiement effective. */
  liaisons?: string[];
}

function cellule(texte: string): string {
  return texte.replaceAll('|', '/');
}

function ligne(...cellules: string[]): string {
  return `| ${cellules.map(cellule).join(' | ')} |`;
}

function personnes(
  titre: string,
  noms: string[],
  client: string,
): string[] {
  return noms.map((nom) => ligne(titre, nom, nom === client ? 'le client' : 'à retirer'));
}

export function composerLInventaire(
  entrees: readonly EntreeDeclaree[],
  obs: Observations,
  jour: string,
): string {
  const connus = new Set(entrees.map((e) => e.nom));
  const poses = new Set(obs.secretsPoses);
  const liaisons = new Set(obs.liaisons ?? []);
  const sortie: string[] = [
    `# Inventaire de livraison — ${jour}`,
    '',
    'Colonnes « au nom de » et « où la valeur est rangée » : à remplir à la main.',
    '',
    '## Clés et liaisons',
    '',
    ligne('nom', 'lieu', 'portée', 'service gratuit', 'état', 'au nom de', 'où la valeur est rangée'),
    ligne('---', '---', '---', '---', '---', '---', '---'),
  ];
  for (const e of entrees) {
    const present = e.nom === 'DB' ? obs.base !== null : poses.has(e.nom) || liaisons.has(e.nom);
    const etat = present ? 'posé' : `absent — refuse : ${e.geste}`;
    sortie.push(ligne(e.nom, e.lieu, e.portee, e.gratuit ? 'oui' : 'non', etat, '', ''));
  }
  for (const nom of obs.secretsPoses) {
    if (connus.has(nom)) continue;
    sortie.push(ligne(nom, 'secret du compte Cloudflare', '', '', 'inconnu du produit', '', ''));
  }
  sortie.push(
    '',
    '## Valeurs observées',
    '',
    ligne('Domaine', obs.domaine ?? 'non relevé'),
    ligne('Déclencheur', obs.declencheur ?? 'non relevé'),
    ligne('Base rattachée', obs.base ?? 'aucune'),
    '',
    '## Personnes avec accès',
    '',
    ...personnes('membre du compte', obs.membresDuCompte, obs.client),
    ...personnes('collaborateur du dépôt', obs.collaborateursDuDepot, obs.client),
    '',
  );
  return sortie.join('\n');
}
