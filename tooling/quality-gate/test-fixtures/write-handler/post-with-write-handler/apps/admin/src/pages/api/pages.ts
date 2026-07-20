// Fixture : endpoint d'écriture (POST) passant par writeHandler — conforme (FR-006).
import { writeHandler } from "@colibri/core";

interface APIContextLike {
  request: Request;
}

export const POST = writeHandler({ auth: "access" }, async (_ctx: APIContextLike) => {
  return new Response("ok");
});
