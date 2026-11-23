/**
 * Enveloppe d'accès à la plateforme de l'outil de livraison (ADR-0034, ADR-0035).
 * Tout geste qui agit sur la plateforme passe par `lancerSurLeCompte` : le compte
 * visé vient uniquement de `compteCloudflare` dans le fichier d'instance, transmis
 * à wrangler par CLOUDFLARE_ACCOUNT_ID. L'exécuteur est reçu en paramètre.
 */
import { lireLeFichierDInstance } from './fichier-d-instance.ts';

export const NOM_DE_LA_BASE = 'colibri';

export interface SortieDeCommande {
  code: number;
  stdout: string;
  stderr: string;
}

export type Executeur = (
  commande: string,
  args: string[],
  env: Record<string, string | undefined>,
) => Promise<SortieDeCommande>;

export type Lecteur = (chemin: string, encodage: 'utf8') => unknown;

export interface Resultat {
  code: number;
  message: string;
}

type Lancement =
  | { ok: true; sortie: SortieDeCommande; compte: string }
  | { ok: false; resultat: Resultat };

async function lancerSurLeCompte(
  depot: string,
  lire: Lecteur,
  executer: Executeur,
  args: string[],
): Promise<Lancement> {
  const texte = String(await lire(`${depot}/instance.json`, 'utf8'));
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return { ok: false, resultat: { code: 1, message: "instance.json : le fichier n'est pas du JSON lisible." } };
  }
  const present =
    typeof brut === 'object' && brut !== null && (brut as Record<string, unknown>).compteCloudflare;
  if (present === undefined || present === null || present === false) {
    return {
      ok: false,
      resultat: { code: 1, message: 'instance.json : le champ compteCloudflare est manquant.' },
    };
  }
  let compte: string | null;
  try {
    compte = lireLeFichierDInstance(texte).compteCloudflare;
  } catch (erreur) {
    return { ok: false, resultat: { code: 1, message: erreur instanceof Error ? erreur.message : String(erreur) } };
  }
  if (compte === null) {
    return {
      ok: false,
      resultat: { code: 1, message: 'instance.json : le champ compteCloudflare est manquant.' },
    };
  }
  const sortie = await executer('wrangler', args, { CLOUDFLARE_ACCOUNT_ID: compte });
  if (sortie.code !== 0) {
    const detail = (sortie.stderr || sortie.stdout).trim();
    return {
      ok: false,
      resultat: {
        code: 1,
        message: `La connexion n'a pas accès au compte ${compte} ; rien n'a été écrit. Détail : ${detail}`,
      },
    };
  }
  return { ok: true, sortie, compte };
}

export async function creerLaBase(depot: string, lire: Lecteur, executer: Executeur): Promise<Resultat> {
  const liste = await lancerSurLeCompte(depot, lire, executer, ['d1', 'list', '--json']);
  if (!liste.ok) return liste.resultat;
  let bases: unknown;
  try {
    bases = JSON.parse(liste.sortie.stdout);
  } catch {
    return { code: 1, message: 'La liste des bases rendue par la plateforme est illisible ; rien n’a été écrit.' };
  }
  if (!Array.isArray(bases)) {
    return { code: 1, message: 'La liste des bases rendue par la plateforme est illisible ; rien n’a été écrit.' };
  }
  const existe =
    bases.some((b) => typeof b === 'object' && b !== null && (b as { name?: unknown }).name === NOM_DE_LA_BASE);
  if (existe) return { code: 0, message: `La base ${NOM_DE_LA_BASE} existe déjà dans ce compte ; rien n'a été créé.` };

  const creation = await lancerSurLeCompte(depot, lire, executer, ['d1', 'create', NOM_DE_LA_BASE]);
  if (!creation.ok) return creation.resultat;
  return { code: 0, message: `La base ${NOM_DE_LA_BASE} a été créée dans le compte ${creation.compte}.` };
}
