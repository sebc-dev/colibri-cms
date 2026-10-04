/**
 * Lecture bornée du corps d'une écriture de réglage (ticket 05 ; réutilisée
 * aux tickets 07 et 08). Ne lève jamais : rend un verdict par valeur.
 */

/** Taille maximale d'un corps : 64 Kio. */
export const CORPS_TAILLE_MAX = 64 * 1024;

export type LectureCorps =
  | { readonly ok: true; readonly json: unknown }
  | { readonly ok: false; readonly statut: 400 | 413 };

export async function lireCorpsJsonBorne(request: Request): Promise<LectureCorps> {
  const annonce = Number(request.headers.get('content-length'));
  if (Number.isFinite(annonce) && annonce > CORPS_TAILLE_MAX) return { ok: false, statut: 413 };

  const flux = request.body;
  if (!flux) return { ok: false, statut: 400 };
  const lecteur = flux.getReader();
  const morceaux: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      total += value.byteLength;
      if (total > CORPS_TAILLE_MAX) {
        await lecteur.cancel();
        return { ok: false, statut: 413 };
      }
      morceaux.push(value);
    }
  } catch {
    return { ok: false, statut: 400 };
  }

  const octets = new Uint8Array(total);
  let decalage = 0;
  for (const morceau of morceaux) {
    octets.set(morceau, decalage);
    decalage += morceau.byteLength;
  }
  try {
    return { ok: true, json: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(octets)) as unknown };
  } catch {
    return { ok: false, statut: 400 };
  }
}
