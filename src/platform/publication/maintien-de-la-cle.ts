/**
 * Le maintien hebdomadaire de la clé d'écriture (change 020, ticket 10 ; ADR-0021) : GitHub retire
 * une clé restée un an sans usage ; une fois par semaine, l'instance lit la référence `main` du
 * dépôt de la cliente avec cette clé. UNE lecture, aucune écriture, aucun accès à la base ni au
 * bail. La clé n'est jamais consignée.
 *
 * Zone `platform`.
 */
import { creerForgeGithub, depotValide } from './forge-github.ts';

const DELAI_MS = 10_000;
const MESSAGE = '[maintien] clé du dépôt';

type Issue = 'acceptee' | 'acces-refuse' | 'depot-introuvable' | 'depot-injoignable' | 'depot-non-configure';

function consigner(issue: Issue): void {
  console.info(MESSAGE, { issue });
}

/** Lit `main` avec la clé ; consigne l'issue, ne lève jamais. */
export async function maintenirLaCle(depot: unknown, cle: unknown): Promise<void> {
  if (!depotValide(depot) || typeof cle !== 'string' || cle === '') {
    consigner('depot-non-configure');
    return;
  }
  const forge = creerForgeGithub({
    depot,
    jeton: cle,
    fetch: (requete) => globalThis.fetch(new Request(requete, { signal: AbortSignal.timeout(DELAI_MS) })),
  });
  let issue: Issue;
  try {
    const lu = await forge.lireRef('refs/heads/main');
    if (lu.ok) issue = 'acceptee';
    else if (lu.issue === 'acces-refuse') issue = 'acces-refuse';
    else if (lu.issue === 'introuvable') issue = 'depot-introuvable';
    else issue = 'depot-injoignable';
  } catch {
    issue = 'depot-injoignable';
  }
  consigner(issue);
}
