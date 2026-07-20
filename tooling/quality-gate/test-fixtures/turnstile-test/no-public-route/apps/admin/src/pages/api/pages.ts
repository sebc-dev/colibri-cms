// Fixture : endpoint d'écriture privé uniquement (auth: "access") — aucune route publique dans l'arborescence (FR-009).
import { writeHandler } from "@colibri/core";

interface APIContextLike {
  request: Request;
}

export const POST = writeHandler({ auth: "access" }, async (_ctx: APIContextLike) => {
  return new Response("ok");
});
