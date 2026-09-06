/**
 * Sonde de développement — `GET /_sonde`.
 *
 * Prouve que le serveur de développement local (`npm run dev`) partage le
 * même état que celui sur lequel `npm run db:migrate` vient d'appliquer ses
 * migrations (FR-012, SC-006) : elle lit le nombre de lignes de
 * `d1_migrations` sur la base locale et le rend tel quel.
 *
 * Injectée par `astro.config.ts`, uniquement quand `command === 'dev'`
 * (`injectRoute`) — elle n'entre jamais dans l'artefact bâti (FR-024) : sa
 * double absence dans `dist/` se constate après `npm run build`.
 *
 * Elle vit dans `platform/` — lire D1 est le métier de cette zone (`I2`) —
 * et non dans un `src/pages/` : une route sous `src/pages/` entrerait dans
 * l'artefact bâti, ce que `FR-024` interdit (plan § décision 4). Elle ne
 * porte donc aucun garde de session (`I6`) : ce qui tient l'intention d'`I6`
 * ici n'est pas un garde, c'est son absence de l'artefact bâti.
 *
 * L'accès à la liaison D1 passe par `cloudflare:workers`, pas par
 * `Astro.locals.runtime.env` — retiré depuis Astro v6 (plan § décision 3) ;
 * c'est la seule porte d'entrée de la plateforme, et `I2` la ferme à
 * `src/core/`.
 *
 * `@cloudflare/workers-types` n'est pas une dépendance de ce lot :
 * `./cloudflare-workers.d.ts`, dans ce même répertoire, type le seul module
 * et le seul geste dont cette sonde a besoin (`prepare(...).first(...)`),
 * sans rien emprunter d'ailleurs ni élargir le typage global du projet. Une
 * déclaration ambiante de module ne peut pas vivre dans ce fichier : dès
 * qu'un fichier `.ts` porte un `import`/`export` de haut niveau, TypeScript
 * le traite comme un module et un `declare module 'cloudflare:workers' {}`
 * y devient une *augmentation* d'un module déjà résolu — jamais sa création
 * (`TS2664`, mesuré) — d'où le fichier `.d.ts` voisin, sans import ni
 * export, seule forme qui déclare effectivement le module.
 */
import { env } from 'cloudflare:workers';

export const prerender = false;

export async function GET(): Promise<Response> {
  const n = await env.DB.prepare('select count(*) as n from d1_migrations').first<number>('n');
  return new Response(JSON.stringify({ n: n ?? 0 }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
