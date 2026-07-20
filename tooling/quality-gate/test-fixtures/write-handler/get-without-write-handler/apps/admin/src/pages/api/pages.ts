// Fixture : endpoint de lecture (GET) — hors périmètre de FR-006 (seuls les endpoints d'écriture sont concernés).
interface APIContextLike {
  request: Request;
}

export const GET = async (_ctx: APIContextLike): Promise<Response> => {
  return new Response("[]");
};
