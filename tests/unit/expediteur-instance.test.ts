/**
 * Ticket 01 (007-expediteur-code-connexion) — validation pure de l'adresse
 * d'expéditeur déclarée par l'instance (`senderAddress`). Cette fonction est
 * appelée par `astro.config.ts` : une valeur refusée arrête la construction
 * du site en nommant le champ.
 */
import { describe, it, expect } from "vitest";
import { exigerAdresseExpediteur } from "../../src/platform/instance/expediteur.ts";

describe("adresse d’expéditeur de l’instance", () => {
  it("SC-01b — une adresse e-mail valide est acceptée telle quelle", () => {
    expect(exigerAdresseExpediteur("code@envoi.exemple.fr")).toBe(
      "code@envoi.exemple.fr",
    );
  });

  it.each([
    ["absente", undefined],
    ["vide", ""],
    ["sans @", "code.envoi.exemple.fr"],
    ["avec espaces", "code @envoi.exemple.fr"],
    ["au domaine sans point", "code@envoi"],
    ["non textuelle", 42],
  ])(
    "SC-01b — une adresse %s est refusée par une erreur qui nomme senderAddress",
    (_cas, valeur) => {
      expect(() => exigerAdresseExpediteur(valeur)).toThrow(/senderAddress/);
    },
  );
});
