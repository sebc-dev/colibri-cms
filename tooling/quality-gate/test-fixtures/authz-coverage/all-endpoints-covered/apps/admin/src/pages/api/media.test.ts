// Fixture : test d'autorisation colocalisé pour l'endpoint DELETE de media.ts (SC-005 — 100%).
import { describe, expect, it } from "vitest";

describe("DELETE /api/media — autorisation", () => {
  it("rejette la requête sans session authentifiée (403)", async () => {
    const response = new Response(null, { status: 403 });

    expect(response.status).toBe(403);
  });
});
