// Fixture : second endpoint d'écriture, sans test d'autorisation colocalisé — couverture non totale (FR-007).
import { writeHandler } from "@colibri/core";

interface APIContextLike {
  request: Request;
}

export const DELETE = writeHandler({ auth: "access" }, async (_ctx: APIContextLike) => {
  return new Response(null, { status: 204 });
});
