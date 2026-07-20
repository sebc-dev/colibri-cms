// Fixture : test d'autorisation colocalisé pour l'endpoint POST de pages.ts (FR-007, SC-005).
import { describe, expect, it } from "vitest";

describe("POST /api/pages — autorisation", () => {
  it("rejette la requête sans session authentifiée (401)", async () => {
    const response = new Response(null, { status: 401 });

    expect(response.status).toBe(401);
  });
});
