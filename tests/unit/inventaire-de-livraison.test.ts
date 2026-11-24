/**
 * Ticket 09 (020-deploiement-instance-client) — l'inventaire de livraison.
 * La composition est une fonction pure (liste déclarée + observations -> texte) ;
 * le geste `inventaire` de l'outil de livraison relève les observations par
 * l'exécuteur de commandes, doublé par des sorties enregistrées : la frontière
 * est mockée, pas la logique. Oracle : les lignes du fichier produit.
 */
import { describe, it, expect } from "vitest";
import {
  ENTREES_DECLAREES,
  composerLInventaire,
  type Observations,
} from "../../src/platform/instance/inventaire.ts";
import { deriverConfigurationDeDeploiement } from "../../src/platform/instance/configuration-de-deploiement.ts";

const CONFIGURATION = import.meta.glob<string>("/wrangler.jsonc", {
  query: "?raw",
  import: "default",
  eager: true,
});

const CLIENT = "boulangerie-martin";
const AUTRE = "integrateur-tiers";
const SECRETS_ATTENDUS = ["EXPEDITEUR_CODE_CONNEXION", "JETON_DEPOT", "JETON_ADRESSES_EMAIL", "COLIBRI_CLE_LECTURE_DEPOT"];
const JOUR = "2026-11-24";

function observations(surcharge: Partial<Observations> = {}): Observations {
  return {
    secretsPoses: ["JETON_DEPOT", "JETON_ADRESSES_EMAIL", "COLIBRI_CLE_LECTURE_DEPOT"],
    base: "colibri",
    declencheur: "17 4 * * 1",
    domaine: "boulangerie-martin.fr",
    client: CLIENT,
    membresDuCompte: [CLIENT],
    collaborateursDuDepot: [CLIENT],
    ...surcharge,
  };
}

function compose(surcharge: Partial<Observations> = {}): string {
  return composerLInventaire(ENTREES_DECLAREES, observations(surcharge), JOUR);
}

function lignesDe(texte: string, nom: string): string[] {
  return texte.split("\n").filter((ligne) => ligne.includes(nom));
}

function ligneDe(texte: string, nom: string): string {
  const lignes = lignesDe(texte, nom);
  expect(lignes, `une ligne exactement pour ${nom}`).toHaveLength(1);
  return lignes[0];
}

/** Les noms de liaison de la configuration de déploiement effective. */
function liaisonsEffectives(): string[] {
  const brut = Object.values(CONFIGURATION)[0]
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("//"))
    .join("\n")
    .replace(/,(\s*[}\]])/g, "$1");
  const produite = JSON.parse(brut) as Record<string, unknown>;
  const effective = deriverConfigurationDeDeploiement(produite, { domain: "boulangerie-martin.fr" }) as {
    d1_databases: { binding: string }[];
    send_email: { name: string }[];
    assets: { binding: string };
  };
  return [
    ...effective.d1_databases.map((b) => b.binding),
    ...effective.send_email.map((b) => b.name),
    effective.assets.binding,
  ];
}

describe("la liste déclarée et sa composition", () => {
  it("SC-09a — une ligne pour chaque clé lue à l'exécution ou à la construction et pour chaque liaison de la configuration effective", () => {
    const texte = compose();
    const liaisons = liaisonsEffectives();
    expect(liaisons).toEqual(expect.arrayContaining(["DB", "ASSETS", "EXPEDITEUR_CODE_CONNEXION"]));
    for (const nom of [...SECRETS_ATTENDUS, ...liaisons]) {
      expect(lignesDe(texte, nom), nom).toHaveLength(1);
    }
    for (const entree of ENTREES_DECLAREES) {
      expect(entree.geste.length, entree.nom).toBeGreaterThan(0);
      expect(entree.lieu.length, entree.nom).toBeGreaterThan(0);
      expect(entree.portee.length, entree.nom).toBeGreaterThan(0);
      expect(typeof entree.gratuit, entree.nom).toBe("boolean");
    }
  });

  it("SC-09b — sur des clés de valeur connue, ni la valeur ni aucun fragment n'entre dans l'inventaire", () => {
    const valeurs = ["jt_Zx81QwErTy92LmNpAs", "adr_Ko77PlMnBv33CxZa", "cle_Hg55FdSaQw11ErTy"];
    const texte = compose({
      secretsPoses: ["JETON_DEPOT", "JETON_ADRESSES_EMAIL", "COLIBRI_CLE_LECTURE_DEPOT"],
    });
    for (const valeur of valeurs) {
      for (let debut = 0; debut + 6 <= valeur.length; debut += 1) {
        expect(texte).not.toContain(valeur.slice(debut, debut + 6));
      }
    }
  });

  it("SC-09c — avec le code de secours en place, l'inventaire n'en dit rien : ni code, ni empreinte, ni table", () => {
    const empreinte = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
    const code = "0123456789ABCDEFGHJKMNPQRS";
    const texte = compose({ secretsPoses: [...SECRETS_ATTENDUS, "CODE_DE_SECOURS"] });
    expect(texte).not.toContain(empreinte);
    expect(texte).not.toContain(code);
    expect(texte).not.toMatch(/[0-9a-f]{32,}/i);
    expect(ligneDe(texte, "CODE_DE_SECOURS")).toMatch(/inconnu du produit/);
    expect(ENTREES_DECLAREES.map((e) => e.nom.toLowerCase()).join(" ")).not.toMatch(/secours|reprise|empreinte/);
  });

  it("SC-09d — une clé posée que le produit ne lit pas est signalée inconnue du produit", () => {
    const texte = compose({ secretsPoses: [...SECRETS_ATTENDUS, "CLE_ORPHELINE"] });
    expect(ligneDe(texte, "CLE_ORPHELINE")).toMatch(/inconnu du produit/);
    expect(ligneDe(texte, "JETON_DEPOT")).not.toMatch(/inconnu du produit/);
  });

  it("SC-09e — une clé que le produit lit et qui n'est pas posée est absente, avec le geste que son absence refuse", () => {
    const texte = compose({ secretsPoses: ["JETON_DEPOT", "COLIBRI_CLE_LECTURE_DEPOT"] });
    const ligne = ligneDe(texte, "JETON_ADRESSES_EMAIL");
    const entree = ENTREES_DECLAREES.find((e) => e.nom === "JETON_ADRESSES_EMAIL");
    expect(entree).toBeDefined();
    expect(ligne).toMatch(/absent/);
    expect(ligne).toContain(entree?.geste);
    expect(ligneDe(texte, "JETON_DEPOT")).toMatch(/posé/);
    expect(ligneDe(texte, "JETON_DEPOT")).not.toMatch(/absent/);
  });

  it("SC-09e — aucune clé posée : chaque clé attendue est absente", () => {
    const texte = compose({ secretsPoses: [] });
    for (const nom of SECRETS_ATTENDUS) {
      expect(ligneDe(texte, nom), nom).toMatch(/absent/);
    }
  });

  it("SC-09f — un membre et un collaborateur qui ne sont pas le client sont à retirer ; le client ne l'est pas", () => {
    const texte = compose({
      membresDuCompte: [CLIENT, "membre-tiers"],
      collaborateursDuDepot: [CLIENT, AUTRE],
    });
    expect(ligneDe(texte, "membre-tiers")).toMatch(/à retirer/);
    expect(ligneDe(texte, AUTRE)).toMatch(/à retirer/);
    for (const ligne of lignesDe(texte, CLIENT).filter((l) => !l.includes("boulangerie-martin.fr"))) {
      expect(ligne).not.toMatch(/à retirer/);
    }
    expect(lignesDe(texte, CLIENT).length).toBeGreaterThanOrEqual(2);
  });

  it("SC-09f — aucun autre que le client : rien n'est à retirer", () => {
    const texte = compose();
    expect(texte).not.toMatch(/membre-tiers|integrateur-tiers/);
    expect(texte.match(/à retirer/g) ?? []).toHaveLength(0);
  });
});

interface CommandeLancee {
  commande: string;
  args: string[];
}

const VALEURS_CONNUES = {
  JETON_DEPOT: "jt_Zx81QwErTy92LmNpAs",
  JETON_ADRESSES_EMAIL: "adr_Ko77PlMnBv33CxZa",
  CLE_ORPHELINE: "orph_Uy66TrEwQa44PoIu",
};

function executeurEnregistre() {
  const lancees: CommandeLancee[] = [];
  const executer = (commande: string, args: string[]) => {
    lancees.push({ commande, args });
    const reponse = (stdout: string) => Promise.resolve({ code: 0, stdout, stderr: "" });
    if (commande === "gh") {
      return reponse(JSON.stringify([{ login: CLIENT }, { login: AUTRE }]));
    }
    if (args.includes("secret") && args.includes("list")) {
      return reponse(
        JSON.stringify(
          Object.entries(VALEURS_CONNUES).map(([name, value]) => ({ name, type: "secret_text", value })),
        ),
      );
    }
    if (args.includes("d1") && args.includes("list")) {
      return reponse(JSON.stringify([{ name: "colibri", uuid: "0123456789abcdef0123456789abcdef" }]));
    }
    return reponse("[]");
  };
  return { executer, lancees };
}

describe("le geste inventaire de l'outil de livraison", () => {
  it("SC-09b — le fichier écrit ne porte aucune valeur de clé posée, ni fragment, et ne touche pas au code de secours", async () => {
    const { inventaire } = (await import("../../scripts/livraison.mjs")) as {
      inventaire: (
        depot: string,
        acces: Record<string, unknown>,
        sortie?: { log: (m: string) => void; error: (m: string) => void },
      ) => Promise<{ code: number; chemin?: string }>;
    };
    const { executer, lancees } = executeurEnregistre();
    const ecritures: { chemin: string; contenu: string }[] = [];
    const instance = JSON.stringify({
      domain: "boulangerie-martin.fr",
      senderAddress: "code@envoi.boulangerie-martin.fr",
      depotDePublication: `${CLIENT}/site`,
      compteCloudflare: "fedcba9876543210fedcba9876543210",
    });
    const resultat = await inventaire(
      "/depot",
      {
        lire: () => Promise.resolve(instance),
        executer,
        ecrire: (chemin: string, contenu: string) => {
          ecritures.push({ chemin, contenu });
          return Promise.resolve();
        },
        maintenant: () => new Date("2026-11-24T10:00:00Z"),
      },
      { log: () => undefined, error: () => undefined },
    );
    expect(resultat.code).toBe(0);
    expect(ecritures).toHaveLength(1);
    expect(ecritures[0].chemin).toMatch(/\.md$/);
    expect(ecritures[0].chemin).toContain(JOUR);
    const texte = ecritures[0].contenu;
    for (const valeur of Object.values(VALEURS_CONNUES)) {
      for (let debut = 0; debut + 6 <= valeur.length; debut += 1) {
        expect(texte).not.toContain(valeur.slice(debut, debut + 6));
      }
    }
    expect(ligneDe(texte, "CLE_ORPHELINE")).toMatch(/inconnu du produit/);
    expect(ligneDe(texte, "JETON_DEPOT")).toMatch(/posé/);
    expect(ligneDe(texte, AUTRE)).toMatch(/à retirer/);
    for (const { args } of lancees) {
      expect(args.join(" ")).not.toMatch(/secours|secret (get|put|delete)|d1 (execute|create)/);
    }
  });
});
