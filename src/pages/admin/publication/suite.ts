/**
 * La suite de la publication (change 011, ticket 15) : dépose la branche des images puis la
 * branche principale en une seule passe, finalise en un lot D1. Gardée (I6), `SameSite=Strict`
 * (ADR-0011, I13), aucune écriture en GET. Les passes bornées sont le ticket 17.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../platform/session/index.ts';
import { lireCorpsJsonBorne } from '../../../platform/reglages/corps.ts';
import {
  type IssueSuite,
  lecteurDesOriginalesEmpaquetees,
  obtenirForge,
  poursuivrePublication,
} from '../../../platform/publication/publier.ts';

/** Le statut HTTP de chaque issue manquée de la suite : un cas neuf sans statut ne type pas. */
const STATUT_PAR_RAISON: Readonly<Record<Extract<IssueSuite, { ok: false }>['raison'], number>> = {
  'verrou-perdu': 409,
  'a-finaliser': 503,
  echec: 502,
};

export const POST: APIRoute = async ({ request }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const corps = await lireCorpsJsonBorne(request);
  if (!corps.ok) {
    return Response.json({ ok: false, raison: 'forme-invalide' }, { status: corps.statut });
  }
  const jeton = (corps.json as { jeton?: unknown } | null)?.jeton;
  if (typeof jeton !== 'string') {
    return Response.json({ ok: false, raison: 'forme-invalide' }, { status: 400 });
  }

  const issue = await poursuivrePublication(
    env.DB,
    jeton,
    Date.now(),
    obtenirForge(),
    lecteurDesOriginalesEmpaquetees(env.ASSETS),
  );
  if (!issue.ok) {
    return Response.json(
      { ok: false, raison: issue.raison },
      { status: STATUT_PAR_RAISON[issue.raison] },
    );
  }
  return Response.json({ ok: true, fini: true });
};
