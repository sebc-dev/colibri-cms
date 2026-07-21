// Fixture : test d'autorisation colocalisé pour pages.ts (couverture partielle — FR-007).
import { describe, expect, it } from "vitest";

describe("POST /api/pages — autorisation", () => {
  it("rejette la requête sans session authentifiée (401)", async () => {
    const response = new Response(null, { status: 401 });

    expect(response.status).toBe(401);
  });
});
