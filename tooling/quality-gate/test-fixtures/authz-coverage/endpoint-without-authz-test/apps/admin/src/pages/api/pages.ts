// Fixture : endpoint d'écriture (POST) via writeHandler, sans test d'autorisation colocalisé — interdit (FR-007).
import { writeHandler } from "@colibri/core";

interface APIContextLike {
  request: Request;
}

export const POST = writeHandler({ auth: "access" }, async (_ctx: APIContextLike) => {
  return new Response("ok");
});
