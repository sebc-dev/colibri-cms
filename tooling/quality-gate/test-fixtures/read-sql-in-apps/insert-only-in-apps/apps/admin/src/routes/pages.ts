// Fixture : SQL d'écriture uniquement (INSERT) dans apps/* — autorisé (seule la lecture est interdite, FR-005).
interface D1DatabaseLike {
  prepare(query: string): { bind(...values: unknown[]): { run(): Promise<unknown> } };
}

export async function createPage(db: D1DatabaseLike, title: string) {
  return db.prepare("INSERT INTO pages (title) VALUES (?)").bind(title).run();
}
