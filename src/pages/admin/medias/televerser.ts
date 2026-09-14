/**
 * La route de téléversement d'une image dans la réserve brouillon — ticket 04
 * (openspec/changes/004-bibliotheque-de-medias/tickets/04-reserve-persister-servir.md,
 * SC-04a).
 *
 * Gardée par `verifierSession` (ADR-0007, I6) : aucune session valide,
 * aucune lecture du corps — I6 n'autorise un corps `multipart` que sous
 * `src/pages/admin/`, jamais sur la surface publique (`src/pages/api/
 * public/`), et cette route vit précisément là.
 *
 * Cette route ne redécide JAMAIS du format : elle relit les octets du
 * fichier soumis et confie la décision à `analyserImage`
 * (`src/core/medias/ingestion.ts`, ticket 01) — le type stocké est celui
 * qu'elle déduit, jamais `typeDeclare` (le `Content-Type` de la partie
 * `multipart`) ni l'extension du nom de fichier (SC-04d).
 *
 * Anti-forgerie (ADR-0011) : le seul rempart est le cookie de session
 * `__Host-session`, `SameSite=Strict` (`src/platform/session/index.ts`,
 * `verifierSession`) — aucun jeton dédié, comme les autres écritures
 * d'administration (`src/pages/admin/pages/[slug]/emplacements/[id].ts`).
 *
 * Aucun en-tête de sécurité n'est posé ici (I11) : c'est le rôle exclusif
 * du middleware `src/platform/entetes/middleware.ts` (ADR-0008/ADR-0004).
 *
 * Champ de formulaire attendu : `fichier` (corps `multipart/form-data`) —
 * le ticket ne fixe pas ce nom (gap noté au cadrage), retenu ici par
 * convention avec le reste du produit (français, sans terme de développeur
 * dans la forme du champ).
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../platform/session/index.ts';
import { analyserImage } from '../../../core/medias/ingestion.ts';
import { persisterMediaBrouillon } from '../../../platform/medias/magasin.ts';

export const POST: APIRoute = async ({ request }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  let donnees: FormData;
  try {
    donnees = await request.formData();
  } catch {
    return Response.json({ ok: false, raison: 'forme-invalide' }, { status: 400 });
  }

  const fichier = donnees.get('fichier');
  if (!(fichier instanceof File)) {
    return Response.json({ ok: false, raison: 'forme-invalide' }, { status: 400 });
  }

  const octets = new Uint8Array(await fichier.arrayBuffer());
  // `typeDeclare` (fichier.type) est transmis à `analyserImage` — qui ne le
  // lit jamais pour décider (SC-04d, docs de `core/medias/ingestion.ts`) —
  // uniquement pour que la signature d'entrée reste celle qu'un vrai
  // téléversement porte.
  const resultat = analyserImage({ octets, nomFichier: fichier.name, typeDeclare: fichier.type });

  if (!resultat.admise) {
    return Response.json({ ok: false, raison: resultat.motif }, { status: 400 });
  }

  const persistance = await persisterMediaBrouillon(
    env.DB,
    {
      nomOrigine: fichier.name,
      format: resultat.format,
      dimensions: resultat.dimensions,
      octets,
    },
    Date.now(),
  );

  if (!persistance.persiste) {
    return Response.json({ ok: false, raison: persistance.motif }, { status: 400 });
  }

  return Response.json(
    { ok: true, id: persistance.id, format: resultat.format, dimensions: resultat.dimensions },
    { status: 201 },
  );
};
