// Fixture : route publique (writeHandler auth: "public") couverte par un test de rejet Turnstile (FR-008).
import { writeHandler } from "@colibri/core";

interface APIContextLike {
  request: Request;
}

export const POST = writeHandler({ auth: "public" }, async (_ctx: APIContextLike) => {
  return new Response("ok");
});
