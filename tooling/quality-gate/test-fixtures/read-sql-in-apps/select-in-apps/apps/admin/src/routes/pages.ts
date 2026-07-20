// Fixture : SQL de lecture (SELECT) présent dans apps/* — interdit (ADR-0004, FR-005).
interface D1DatabaseLike {
  prepare(query: string): { all(): Promise<unknown> };
}

export async function loadPages(db: D1DatabaseLike) {
  return db.prepare("SELECT * FROM pages").all();
}
