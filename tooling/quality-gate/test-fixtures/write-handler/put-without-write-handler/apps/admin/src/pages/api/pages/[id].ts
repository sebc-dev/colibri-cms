// Fixture : endpoint d'écriture (PUT) ne passant pas par writeHandler — interdit (ADR-0004, FR-006).
interface APIContextLike {
  request: Request;
}

export const PUT = async (_ctx: APIContextLike): Promise<Response> => {
  return new Response("ok");
};
