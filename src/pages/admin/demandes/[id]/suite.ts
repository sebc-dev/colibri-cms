/**
 * Noter la suite d'une demande (change 013, ticket 07). Même patron que la route des options :
 * `verifierSession` en tête (ADR-0007, I6), anti-forgerie par le cookie `SameSite=Strict`
 * (ADR-0011), jamais de détail technique dans une réponse d'échec.
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifierSession } from '../../../../platform/session/index.ts';
import { lireCorpsJsonBorne } from '../../../../platform/reglages/corps.ts';
import { noterSuite, compterParFormulaire } from '../../../../platform/demandes/magasin.ts';
import { lireFormulairesDeLaDeclaration } from '../../../../platform/contenu/formulaires.ts';
import { composerNombres } from '../../../../core/demandes/nombres.ts';
import { suiteDuCorps } from '../../../../core/demandes/suite.ts';

export const POST: APIRoute = async ({ request, params }) => {
  const session = await verifierSession(env.DB, request);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const corps = await lireCorpsJsonBorne(request);
  if (!corps.ok) {
    return Response.json({ ok: false, raison: corps.statut === 413 ? 'corps-trop-gros' : 'forme-invalide' }, { status: corps.statut });
  }
  const suite = suiteDuCorps(corps.json);
  if (suite === null) {
    return Response.json({ ok: false, raison: 'forme-invalide' }, { status: 400 });
  }

  let notee: boolean;
  try {
    notee = await noterSuite(env.DB, params.id ?? '', suite);
  } catch {
    return Response.json({ ok: false, raison: 'non-enregistree' }, { status: 500 });
  }
  if (!notee) {
    return Response.json({ ok: false, raison: 'introuvable' }, { status: 404 });
  }
  // La suite est enregistrée : un calcul des nombres qui échoue ne la défait pas, il est omis.
  try {
    const nombres = composerNombres(await compterParFormulaire(env.DB), lireFormulairesDeLaDeclaration());
    return Response.json({ ok: true, nombres });
  } catch {
    return Response.json({ ok: true });
  }
};
