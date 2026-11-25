/**
 * Contrôle pur d'un fichier d'instance avant mise en service (ADR-0034, I8).
 * La fonction pure reçoit le texte d'`instance.json` — ne lit rien, n'écrit
 * rien ; `controlerLeDepot` lit ce fichier par l'accès reçu en paramètre — et rend la
 * liste des refus { champ, motif }, vide quand l'instance est prête. La forme
 * des valeurs reste jugée par `fichier-d-instance.ts` (seul point de validation).
 */
import { lireLeFichierDInstance } from './fichier-d-instance.ts';

export interface Refus {
  champ: string;
  motif: string;
}

const DOMAINE_D_EXEMPLE = 'exemple.colibri.test';
const COMPTE_D_EXEMPLE = '0123456789abcdef0123456789abcdef';
const SUFFIXES_RESERVES = ['.test', '.example'];
const DOMAINES_RESERVES = ['example.com', 'example.org'];

function sousDomaineDe(hote: string, domaine: string): boolean {
  return hote === domaine || hote.endsWith(`.${domaine}`);
}

function domaineReserve(domaine: string): boolean {
  const d = domaine.toLowerCase();
  return (
    SUFFIXES_RESERVES.some((s) => d.endsWith(s)) ||
    DOMAINES_RESERVES.some((r) => sousDomaineDe(d, r))
  );
}

export function controlerLeFichierDInstance(texte: string): Refus[] {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return [{ champ: 'instance.json', motif: "le fichier est vide ou n'est pas du JSON lisible" }];
  }
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) {
    return [{ champ: 'instance.json', motif: 'le fichier doit contenir un objet' }];
  }

  const refus: Refus[] = [];
  const source = brut as Record<string, unknown>;
  const manquants = ['depotDePublication', 'compteCloudflare'].filter(
    (nom) => source[nom] === undefined || source[nom] === null,
  );
  for (const nom of manquants) refus.push({ champ: nom, motif: 'champ manquant' });
  const contenu: Record<string, unknown> = Object.fromEntries(
    Object.entries(source).filter(([nom]) => !manquants.includes(nom)),
  );

  let valeurs;
  try {
    valeurs = lireLeFichierDInstance(JSON.stringify(contenu));
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    const champ = /le champ (\w+)/.exec(message)?.[1] ?? 'instance.json';
    refus.push({ champ, motif: message });
    return refus;
  }

  const domaine = valeurs.domain.toLowerCase();
  if (sousDomaineDe(domaine, DOMAINE_D_EXEMPLE)) {
    refus.push({ champ: 'domain', motif: "valeur d'exemple du produit à remplacer" });
  } else if (domaineReserve(domaine)) {
    refus.push({ champ: 'domain', motif: 'nom de domaine réservé, qui ne peut pas être celui d’une instance' });
  }

  const hoteExpediteur = valeurs.senderAddress.slice(valeurs.senderAddress.lastIndexOf('@') + 1).toLowerCase();
  if (sousDomaineDe(hoteExpediteur, DOMAINE_D_EXEMPLE)) {
    refus.push({ champ: 'senderAddress', motif: "adresse d'exemple du produit à remplacer" });
  } else if (!sousDomaineDe(hoteExpediteur, domaine)) {
    refus.push({
      champ: 'senderAddress',
      motif: "l'adresse n'appartient ni au nom de domaine de l'instance ni à l'un de ses sous-domaines",
    });
  }

  if (valeurs.compteCloudflare === COMPTE_D_EXEMPLE) {
    refus.push({ champ: 'compteCloudflare', motif: "identifiant de compte d'exemple du produit à remplacer" });
  }
  return refus;
}

export async function controlerLeDepot(
  depot: string,
  lire: (chemin: string, encodage: 'utf8') => unknown,
): Promise<Refus[]> {
  const texte = await lire(`${depot}/instance.json`, 'utf8');
  return controlerLeFichierDInstance(String(texte));
}

export interface FichierVersionne {
  chemin: string;
  texte: string;
}

/** Formes de clé d'accès connues : dépôt de publication (github_pat_, ghp_ et voisins) et préfixes Cloudflare. */
const FORMES_DE_CLE = [
  /github_pat_\w{20,}/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/,
  /\bcf(?:ut|at|k)_[A-Za-z0-9_-]{20,}/,
];

/**
 * Contrôle des fichiers versionnés (design D8, familles 2 et 3) : refuse tout
 * identifiant désigné de l'intégrateur (insensible à la casse, y compris dans un
 * mot plus long) et toute valeur à forme de clé. Pour une clé, le refus nomme le
 * fichier et la ligne, jamais la valeur ni un fragment. Les proscrits viennent de
 * la seule ligne de commande ; la fonction ne lit rien.
 */
export function controlerLesFichiersVersionnes(
  fichiers: readonly FichierVersionne[],
  proscrits: readonly string[],
): Refus[] {
  const refus: Refus[] = [];
  const cherches = proscrits.map((p) => p.trim()).filter((p) => p !== '');
  for (const { chemin, texte } of fichiers) {
    const bas = texte.toLowerCase();
    for (const proscrit of cherches) {
      if (bas.includes(proscrit.toLowerCase())) {
        refus.push({ champ: chemin, motif: `contient l'identifiant désigné « ${proscrit} »` });
      }
    }
    texte.split(/\r?\n/).forEach((ligne, i) => {
      if (FORMES_DE_CLE.some((forme) => forme.test(ligne))) {
        refus.push({ champ: `${chemin} (ligne ${String(i + 1)})`, motif: "valeur à forme de clé d'accès" });
      }
    });
  }
  return refus;
}
