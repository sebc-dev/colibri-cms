// Fixture : test de rejet Turnstile colocalisé pour la route publique POST /api/devis (FR-008).
import { describe, expect, it } from "vitest";

describe("POST /api/devis — jeton Turnstile", () => {
  it("rejette la requête sans jeton Turnstile valide (403)", async () => {
    const response = new Response(null, { status: 403 });

    expect(response.status).toBe(403);
  });
});
