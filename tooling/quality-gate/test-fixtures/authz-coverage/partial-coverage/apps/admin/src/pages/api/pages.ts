// Fixture : endpoint d'écriture couvert par un test d'autorisation (couverture partielle — FR-007).
import { writeHandler } from "@colibri/core";

interface APIContextLike {
  request: Request;
}

export const POST = writeHandler({ auth: "access" }, async (_ctx: APIContextLike) => {
  return new Response("ok");
});
