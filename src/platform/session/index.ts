/**
 * Le garde de session (ADR-0007) — `docs/adr/0007-garde-de-session-par-import-et-surface-publique-close.md`.
 *
 * Tout fichier de route sous `src/pages/admin/` (et, plus tard, sous
 * `src/pages/api/` hors `src/pages/api/public/`) importe ce module : la
 * polarité tenue par l'ADR est le placement de l'import, pas la seule
 * invocation — mais ce ticket (01, « La porte close ») va plus loin et fait
 * réellement obéir `src/pages/admin/index.astro` au verdict qu'il rend.
 *
 * **Aucune session ne peut exister à ce ticket** : `verifierSession` refuse
 * tout, sans exception, quel que soit ce que porte la requête (aucun cookie,
 * n'importe quel cookie). Ce n'est pas un provisoire oublié — c'est le
 * ticket 06 (le code recopié ouvre la session) qui lui apprendra à
 * reconnaître une session valide, tenue en D1 (ADR-0001).
 */

/** Une session d'administration ouverte et valide. */
export interface Session {
  readonly id: string;
}

/**
 * Rend la session valide portée par la requête, ou `null` s'il n'en existe
 * aucune. À ce ticket, retourne toujours `null` : aucune session n'est
 * encore possible.
 */
export function verifierSession(request: Request): Session | null {
  void request;
  return null;
}
