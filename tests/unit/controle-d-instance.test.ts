/**
 * Ticket 03 (020-deploiement-instance-client) — le contrôle d'instance refuse
 * un fichier d'instance qui n'est pas prêt. La fonction pure reçoit le texte
 * d'instance.json et rend la liste des refus { champ, motif }, vide si prêt.
 */
import { describe, it, expect } from "vitest";
import { controlerLeFichierDInstance } from "../../src/platform/instance/controle.ts";

const pret = {
  domain: "boulangerie-martin.fr",
  senderAddress: "code@envoi.boulangerie-martin.fr",
  depotDePublication: "boulangerie-martin/site",
  compteCloudflare: "fedcba9876543210fedcba9876543210",
};

function texte(surcharge: Record<string, unknown> = {}, retirer: string[] = []): string {
  const contenu: Record<string, unknown> = Object.fromEntries(
    Object.entries({ ...pret, ...surcharge }).filter(([nom]) => !retirer.includes(nom)),
  );
  return JSON.stringify(contenu);
}

function champs(refus: { champ: string }[]): string[] {
  return refus.map((r) => r.champ);
}

describe("contrôle d’instance", () => {
  it("SC-03a — un fichier aux quatre champs bien formés et propres à l’instance est accepté", () => {
    expect(controlerLeFichierDInstance(texte())).toEqual([]);
  });

  it.each(["depotDePublication", "compteCloudflare"])(
    "SC-03b — %s manquant : le refus nomme le champ",
    (champ) => {
      const refus = controlerLeFichierDInstance(texte({}, [champ]));
      expect(champs(refus)).toContain(champ);
      expect(refus.find((r) => r.champ === champ)?.motif).toEqual(expect.any(String));
    },
  );

  it("SC-03b — un champ à null est traité comme manquant", () => {
    const refus = controlerLeFichierDInstance(texte({ depotDePublication: null }));
    expect(champs(refus)).toContain("depotDePublication");
  });

  it("SC-03c — le nom de domaine d’exemple du produit est refusé en nommant domain", () => {
    const refus = controlerLeFichierDInstance(
      texte({ domain: "exemple.colibri.test", senderAddress: "code@envoi.exemple.colibri.test" }),
    );
    expect(champs(refus)).toContain("domain");
  });

  it("SC-03c — l’identifiant de compte d’exemple est refusé en nommant compteCloudflare", () => {
    const refus = controlerLeFichierDInstance(
      texte({ compteCloudflare: "0123456789abcdef0123456789abcdef" }),
    );
    expect(champs(refus)).toContain("compteCloudflare");
  });

  it("SC-03c — l’adresse d’expéditeur d’exemple, dans le domaine de l’instance, est refusée en nommant senderAddress", () => {
    // Domaine propre à l'instance : seule la valeur d'exemple peut motiver le refus.
    const refus = controlerLeFichierDInstance(
      texte({ domain: "boulangerie-martin.fr", senderAddress: "code@envoi.exemple.colibri.test" }),
    );
    expect(champs(refus)).toContain("senderAddress");
    expect(refus.find((r) => r.champ === "senderAddress")?.motif).toMatch(/exemple/i);
  });

  it("SC-03c — l’expéditeur d’exemple est refusé même quand domain l’englobe", () => {
    const refus = controlerLeFichierDInstance(
      texte({ domain: "exemple.colibri.test", senderAddress: "code@envoi.exemple.colibri.test" }),
    );
    expect(champs(refus)).toEqual(expect.arrayContaining(["domain", "senderAddress"]));
  });

  it.each(["site.test", "site.example", "example.com", "example.org"])(
    "SC-03c — le domaine réservé %s est refusé en nommant domain",
    (domain) => {
      const refus = controlerLeFichierDInstance(
        texte({ domain, senderAddress: `code@${domain}` }),
      );
      expect(champs(refus)).toContain("domain");
    },
  );

  it.each([
    ["domaine voisin", "code@autre-boulangerie.fr"],
    ["suffixe sans point", "code@xboulangerie-martin.fr"],
    ["domaine tiers", "code@gmail.com"],
  ])("SC-03d — expéditeur hors du domaine (%s) : le refus nomme senderAddress", (_cas, adresse) => {
    const refus = controlerLeFichierDInstance(texte({ senderAddress: adresse }));
    expect(champs(refus)).toContain("senderAddress");
  });

  it.each(["code@boulangerie-martin.fr", "code@envoi.boulangerie-martin.fr"])(
    "SC-03d — l’expéditeur %s, dans le domaine ou un sous-domaine, est accepté",
    (adresse) => {
      expect(controlerLeFichierDInstance(texte({ senderAddress: adresse }))).toEqual([]);
    },
  );

  it("SC-03e — réussite ou refus, le contrôle rend un verdict stable", () => {
    const refuse = texte({ compteCloudflare: "0123456789abcdef0123456789abcdef" }, ["depotDePublication"]);
    const premier = controlerLeFichierDInstance(refuse);
    expect(controlerLeFichierDInstance(refuse)).toEqual(premier);
    expect(premier.length).toBeGreaterThan(0);
  });

  it.each([
    ["dépôt prêt", texte(), 0],
    ["dépôt refusé", texte({ compteCloudflare: "0123456789abcdef0123456789abcdef" }, ["depotDePublication"]), 1],
  ])("SC-03e — l’enveloppe `controler` sur un %s n’enregistre aucune écriture", async (_cas, contenu, code) => {
    const { controler } = (await import("../../scripts/livraison.mjs")) as {
      controler: (
        depot: string,
        acces: Record<string, (...args: string[]) => unknown>,
      ) => Promise<{ code: number }> | { code: number };
    };
    const appels: string[] = [];
    const acces = {
      lire: (chemin: string) => {
        appels.push(`lire ${chemin}`);
        return contenu;
      },
      ecrire: (chemin: string) => appels.push(`ecrire ${chemin}`),
      supprimer: (chemin: string) => appels.push(`supprimer ${chemin}`),
      renommer: (chemin: string) => appels.push(`renommer ${chemin}`),
    };

    const verdict = await controler("/depot-du-client", acces);

    expect(verdict.code === 0).toBe(code === 0);
    expect(appels.filter((a) => !a.startsWith("lire "))).toEqual([]);
    expect(appels.some((a) => a.startsWith("lire "))).toBe(true);
  });
});
