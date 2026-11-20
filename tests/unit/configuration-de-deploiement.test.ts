/**
 * Ticket 02 (020-deploiement-instance-client) — la configuration de déploiement
 * effective sert le domaine de l'instance (ADR-0034). Fonction pure : config
 * produite par la construction + valeurs d'instance -> config effective.
 * Le dernier cas la joue sur le `dist/server/wrangler.json` d'une construction
 * réelle, faite avant les tests par `scripts/batir-site-jetable.mjs`.
 */
import { describe, it, expect } from "vitest";
import { deriverConfigurationDeDeploiement } from "../../src/platform/instance/configuration-de-deploiement.ts";
import type { ValeursDInstance } from "../../src/platform/instance/fichier-d-instance.ts";

const valeurs: ValeursDInstance = {
  domain: "exemple.colibri.test",
  senderAddress: "code@envoi.exemple.colibri.test",
  depotDePublication: null,
  compteCloudflare: null,
};

function produite(): Record<string, unknown> {
  return {
    name: "colibri-cms",
    main: "entry.mjs",
    compatibility_date: "2026-08-01",
    observability: { enabled: true },
    workers_dev: true,
    preview_urls: true,
    d1_databases: [
      {
        binding: "DB",
        database_name: "colibri",
        database_id: "00000000-0000-0000-0000-000000000000",
        migrations_dir: "migrations",
      },
    ],
    send_email: [{ name: "EXPEDITEUR_CODE_CONNEXION" }],
    assets: { binding: "ASSETS", directory: "../client" },
  };
}

const REELLE = import.meta.glob<string>(
  "/.wrangler/site-jetable/arbre/dist/server/wrangler.json",
  { query: "?raw", import: "default", eager: true },
);

describe("configuration de déploiement effective", () => {
  it("SC-02a — sert le nom de domaine de l’instance, sous-domaine compris", () => {
    for (const domain of ["exemple.colibri.test", "www.client.example.org"]) {
      const effective = deriverConfigurationDeDeploiement(produite(), { ...valeurs, domain });
      expect(effective.routes).toEqual([{ pattern: domain, custom_domain: true }]);
    }
  });

  it("SC-02b — n’ouvre ni l’adresse par défaut de la plateforme ni les aperçus", () => {
    const effective = deriverConfigurationDeDeploiement(produite(), valeurs);
    expect(effective.workers_dev).toBe(false);
    expect(effective.preview_urls).toBe(false);
  });

  it("SC-02c — désigne la base par son nom, sans identifiant", () => {
    const effective = deriverConfigurationDeDeploiement(produite(), valeurs);
    const bases = effective.d1_databases as Record<string, unknown>[];
    expect(bases).toHaveLength(1);
    expect(bases[0].database_name).toBe("colibri");
    expect(bases[0]).not.toHaveProperty("database_id");
    expect(JSON.stringify(effective)).not.toContain("database_id");
  });

  it("SC-02d — porte les mêmes liaisons que la configuration produite, sans en ajouter ni en retirer", () => {
    const entree = produite();
    const effective = deriverConfigurationDeDeploiement(entree, valeurs);
    const { d1_databases: baseEntree, ...resteEntree } = entree;
    const { d1_databases: baseEffective, ...resteEffective } = effective;
    expect(resteEffective.send_email).toEqual(resteEntree.send_email);
    expect(resteEffective.assets).toEqual(resteEntree.assets);
    expect(
      (baseEffective as Record<string, unknown>[]).map((b) => [b.binding, b.database_name]),
    ).toEqual((baseEntree as Record<string, unknown>[]).map((b) => [b.binding, b.database_name]));
    const champsAjoutes = Object.keys(resteEffective).filter((c) => !(c in resteEntree));
    expect(champsAjoutes).toEqual(["routes"]);
  });

  it("SC-02d — sans liaison DB dans la configuration produite, la dérivation échoue bruyamment", () => {
    const sansBase = produite();
    delete sansBase.d1_databases;
    expect(() => deriverConfigurationDeDeploiement(sansBase, valeurs)).toThrow(/DB/);
  });

  it("SC-02e — rejouée sur une configuration déjà dérivée, la laisse inchangée", () => {
    const une = deriverConfigurationDeDeploiement(produite(), valeurs);
    const deux = deriverConfigurationDeDeploiement(une, valeurs);
    expect(deux).toEqual(une);
    expect(deriverConfigurationDeDeploiement(deux, valeurs)).toEqual(une);
  });

  it("SC-02a — sur le dist/server/wrangler.json d’une construction réelle, sert le domaine et garde les liaisons", () => {
    const textes = Object.values(REELLE);
    expect(textes.length, "construction absente : lancer `node scripts/batir-site-jetable.mjs`").toBe(1);
    const reelle = JSON.parse(textes[0]) as Record<string, unknown>;
    const effective = deriverConfigurationDeDeploiement(reelle, valeurs);
    expect(effective.routes).toEqual([{ pattern: valeurs.domain, custom_domain: true }]);
    expect(effective.workers_dev).toBe(false);
    expect(effective.preview_urls).toBe(false);
    expect(effective.send_email).toEqual(reelle.send_email);
    expect(JSON.stringify(effective.d1_databases)).not.toContain("database_id");
  });
});
