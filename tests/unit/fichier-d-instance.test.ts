/**
 * Ticket 01 (020-deploiement-instance-client) — le fichier d'instance n'admet
 * que des champs connus et bien formés. Le module reçoit le texte du fichier
 * et rend les valeurs, ou lève une erreur qui nomme le champ en cause.
 */
import { describe, it, expect } from "vitest";
import { lireLeFichierDInstance } from "../../src/platform/instance/fichier-d-instance.ts";

const base = {
  domain: "exemple.colibri.test",
  senderAddress: "code@envoi.exemple.colibri.test",
};

function texte(surcharge: Record<string, unknown> = {}): string {
  return JSON.stringify({ ...base, ...surcharge });
}

describe("fichier d’instance", () => {
  it("SC-01a — un champ inconnu arrête la construction et est nommé", () => {
    expect(() => lireLeFichierDInstance(texte({ champMystere: "x" }))).toThrow(
      /champMystere/,
    );
  });

  it.each([
    ["compteCloudflare mal formé", { compteCloudflare: "pas-hexadecimal" }, /compteCloudflare/],
    ["compteCloudflare non textuel", { compteCloudflare: 42 }, /compteCloudflare/],
    ["depotDePublication mal formé", { depotDePublication: "sans-barre" }, /depotDePublication/],
    ["depotDePublication non textuel", { depotDePublication: 7 }, /depotDePublication/],
    ["domain vide", { domain: "" }, /domain/],
    ["domain avec schéma", { domain: "https://exemple.fr" }, /domain/],
    ["domain avec chemin", { domain: "exemple.fr/blog" }, /domain/],
    ["domain non textuel", { domain: 12 }, /domain/],
    ["senderAddress mal formée", { senderAddress: "pas-une-adresse" }, /senderAddress/],
    ["senderAddress non textuelle", { senderAddress: 5 }, /senderAddress/],
  ])("SC-01b — %s : l’erreur nomme le champ en cause", (_cas, surcharge, motif) => {
    expect(() => lireLeFichierDInstance(texte(surcharge))).toThrow(motif);
  });

  it("SC-01b — un domaine absent est refusé en nommant domain", () => {
    expect(() =>
      lireLeFichierDInstance(JSON.stringify({ senderAddress: base.senderAddress })),
    ).toThrow(/domain/);
  });

  it("SC-01c — turnstilePublicKey encore présent arrête la construction en le nommant", () => {
    expect(() =>
      lireLeFichierDInstance(texte({ turnstilePublicKey: "1x00000000000000000000AA" })),
    ).toThrow(/turnstilePublicKey/);
  });

  it("SC-01d — domaine et adresse d’expéditeur bien formés : la construction aboutit", () => {
    const valeurs = lireLeFichierDInstance(texte());
    expect(valeurs.domain).toBe(base.domain);
    expect(valeurs.senderAddress).toBe(base.senderAddress);
    expect(valeurs.depotDePublication).toBeNull();
    expect(valeurs.compteCloudflare).toBeNull();
  });

  it("SC-01d — les champs optionnels bien formés sont repris", () => {
    const valeurs = lireLeFichierDInstance(
      texte({
        depotDePublication: "proprietaire/depot",
        compteCloudflare: "0123456789abcdef0123456789abcdef",
      }),
    );
    expect(valeurs.depotDePublication).toBe("proprietaire/depot");
    expect(valeurs.compteCloudflare).toBe("0123456789abcdef0123456789abcdef");
  });

  it.each([
    ["fichier vide", ""],
    ["JSON illisible", "{ pas du json"],
  ])("SC-01b — %s : la construction s’arrête avec un message d’instance.json", (_cas, contenu) => {
    expect(() => lireLeFichierDInstance(contenu)).toThrow(/instance\.json/);
  });
});
