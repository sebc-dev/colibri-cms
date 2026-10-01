/**
 * Ticket 01 (007-expediteur-code-connexion) — le message du code part depuis
 * l'adresse d'expéditeur de l'instance, transmise en paramètre au module
 * d'e-mail (module pur, I8 : il ne connaît pas le domaine de l'instance).
 */
import { describe, it, expect } from "vitest";
import {
  demanderExpeditionDuCode,
  type MessageEmail,
} from "../../src/platform/email/index.ts";

const AUTORISEE = "editrice@client.example";
const EXPEDITEUR_INSTANCE = "code@envoi.client.example";

describe("message du code de connexion", () => {
  it("SC-01a — part vers l’adresse autorisée depuis l’expéditeur de l’instance, jamais depuis l’adresse autorisée", async () => {
    const recus: MessageEmail[] = [];
    const liaison = {
      send: (m: MessageEmail) => {
        recus.push(m);
      },
    };

    // Quatrième paramètre : l'adresse d'expéditeur de l'instance.
    await demanderExpeditionDuCode(
      liaison,
      AUTORISEE,
      "ABCD2345",
      EXPEDITEUR_INSTANCE,
    );

    expect(recus).toHaveLength(1);
    expect(recus[0].to).toBe(AUTORISEE);
    expect(recus[0].from).toBe(EXPEDITEUR_INSTANCE);
    expect(recus[0].from).not.toBe(AUTORISEE);
    expect(recus[0].subject).toBe("Votre code de connexion");
    expect(recus[0].text).toBe("Code : ABCD2345");
  });
});
