/**
 * Demande à la route partagée `POST /admin/demandes/retrait` (change 013, tickets 08 et 09,
 * ADR-0030) le retrait d'une ou plusieurs demandes. Seul le cookie de session `SameSite=Strict`
 * l'authentifie (ADR-0011). Lève une erreur si la route refuse ou ne répond pas : chaque îlot garde
 * son propre état (en cours, échec) et ce qu'il fait après un retrait.
 */
import type { MotifDeRetrait } from '../../core/demandes/retrait.ts';

export async function demanderRetrait(ids: readonly string[], motif: MotifDeRetrait): Promise<void> {
  const reponse = await fetch('/admin/demandes/retrait', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ids, motif }),
  });
  const json = (await reponse.json()) as { ok?: boolean };
  if (!reponse.ok || json.ok !== true) throw new Error('refus');
}
