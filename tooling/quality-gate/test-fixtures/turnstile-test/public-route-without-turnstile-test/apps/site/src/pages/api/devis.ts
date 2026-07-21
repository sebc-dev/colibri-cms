// Fixture : route publique (writeHandler auth: "public") sans test de rejet Turnstile colocalisé — interdit (FR-008).
import { writeHandler } from "@colibri/core";

interface APIContextLike {
  request: Request;
}

export const POST = writeHandler({ auth: "public" }, async (_ctx: APIContextLike) => {
  return new Response("ok");
});
