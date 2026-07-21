// Fixture : endpoint d'écriture (POST) via writeHandler, couvert par un test d'autorisation colocalisé (FR-007, SC-005).
import { writeHandler } from "@colibri/core";

interface APIContextLike {
  request: Request;
}

export const POST = writeHandler({ auth: "access" }, async (_ctx: APIContextLike) => {
  return new Response("ok");
});
