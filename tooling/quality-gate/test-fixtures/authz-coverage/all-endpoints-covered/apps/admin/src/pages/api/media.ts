// Fixture : second endpoint d'écriture (DELETE) via writeHandler, couvert par un test d'autorisation colocalisé (SC-005 — 100%).
import { writeHandler } from "@colibri/core";

interface APIContextLike {
  request: Request;
}

export const DELETE = writeHandler({ auth: "access" }, async (_ctx: APIContextLike) => {
  return new Response(null, { status: 204 });
});
