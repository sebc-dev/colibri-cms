/**
 * Lecture pure du fichier d'instance (`instance.json`, I8, ADR-0034). Reçoit
 * le texte du fichier — ne lit rien, ne dépend pas d'Astro — et rend les
 * valeurs, ou lève une erreur qui nomme le champ en cause. Seul point de
 * validation des valeurs d'instance (I19, ADR-0034) : la lecture du fichier passe
 * par `lecture-d-instance.ts`, dans le même dossier.
 */
import { depotValide } from '../publication/forge-github.ts';
import { exigerAdresseExpediteur } from './expediteur.ts';

export interface ValeursDInstance {
  domain: string;
  senderAddress: string;
  depotDePublication: string | null;
  compteCloudflare: string | null;
}

const CHAMPS_CONNUS = ['domain', 'senderAddress', 'depotDePublication', 'compteCloudflare'];
const FORME_COMPTE = /^[0-9a-f]{32}$/;
const FORME_NOM_D_HOTE = /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*$/;

function lireLeJson(texte: string): Record<string, unknown> {
  let contenu: unknown;
  try {
    contenu = JSON.parse(texte);
  } catch {
    throw new Error("instance.json : le fichier est vide ou n'est pas du JSON lisible.");
  }
  if (typeof contenu !== 'object' || contenu === null || Array.isArray(contenu)) {
    throw new Error("instance.json : le fichier doit contenir un objet.");
  }
  return contenu as Record<string, unknown>;
}

export function lireLeFichierDInstance(texte: string): ValeursDInstance {
  const contenu = lireLeJson(texte);

  for (const nom of Object.keys(contenu)) {
    if (!CHAMPS_CONNUS.includes(nom)) {
      throw new Error(`instance.json : le champ ${nom} est inconnu du produit.`);
    }
  }

  const domain = contenu.domain;
  if (typeof domain !== 'string' || !FORME_NOM_D_HOTE.test(domain)) {
    throw new Error(
      "instance.json : le champ domain doit être un nom de domaine, sans schéma ni chemin.",
    );
  }
  const senderAddress = exigerAdresseExpediteur(contenu.senderAddress);

  if (contenu.depotDePublication !== undefined && !depotValide(contenu.depotDePublication)) {
    throw new Error(
      "instance.json : le champ depotDePublication doit avoir la forme « propriétaire/dépôt ».",
    );
  }
  const compte = contenu.compteCloudflare;
  if (compte !== undefined && !(typeof compte === 'string' && FORME_COMPTE.test(compte))) {
    throw new Error(
      'instance.json : le champ compteCloudflare doit être un identifiant de 32 hexadécimaux.',
    );
  }

  return {
    domain,
    senderAddress,
    depotDePublication: contenu.depotDePublication ?? null,
    compteCloudflare: compte ?? null,
  };
}
