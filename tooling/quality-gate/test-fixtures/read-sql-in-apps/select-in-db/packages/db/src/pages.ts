// Fixture : SQL de lecture (SELECT) dans @colibri/db — emplacement autorisé (FR-005 ne vise qu'apps/*).
interface D1DatabaseLike {
  prepare(query: string): { all(): Promise<unknown> };
}

export async function loadPages(db: D1DatabaseLike) {
  return db.prepare("SELECT * FROM pages").all();
}
