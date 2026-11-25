/**
 * Ticket 04 (020-deploiement-instance-client) — le contrôle d'instance refuse
 * tout identifiant désigné de l'intégrateur et toute valeur à forme de clé
 * dans les fichiers versionnés. Fonction pure : reçoit les fichiers versionnés
 * (chemin + texte) et les proscrits, rend la liste des refus { champ, motif }.
 * Valeurs fictives ; les valeurs à forme de clé sont composées à l'exécution.
 */
import { describe, it, expect } from "vitest";
import { controlerLesFichiersVersionnes } from "../../src/platform/instance/controle.ts";

const INTEGRATEUR = "agence-fictive";
const DOMAINE = "agence-fictive.example";

const cle = {
  githubFin: "github_pat_" + "A1b2C3d4E5".repeat(8),
  githubClassique: "ghp_" + "a1B2c3D4e5".repeat(3) + "a1B2c3",
  cloudflare: "cfut_" + "x9Y8z7W6v5".repeat(4),
};

const instance = JSON.stringify({
  domain: "boulangerie-martin.fr",
  senderAddress: "code@envoi.boulangerie-martin.fr",
  depotDePublication: "boulangerie-martin/site",
  compteCloudflare: "fedcba9876543210fedcba9876543210",
});

function fichiers(...extra: { chemin: string; texte: string }[]) {
  return [{ chemin: "instance.json", texte: instance }, ...extra];
}

function messages(refus: { champ: string; motif: string }[]): string {
  return refus.map((r) => `${r.champ} ${r.motif}`).join("\n");
}

describe("contrôle d’instance — identifiants désignés de l’intégrateur", () => {
  it("SC-04a — un identifiant désigné dans le dépôt de publication du fichier d’instance est refusé, fichier et identifiant nommés", () => {
    const texte = JSON.stringify({ ...JSON.parse(instance), depotDePublication: `${INTEGRATEUR}/site` });
    const refus = controlerLesFichiersVersionnes([{ chemin: "instance.json", texte }], [INTEGRATEUR]);
    expect(refus.length).toBeGreaterThan(0);
    expect(messages(refus)).toContain("instance.json");
    expect(messages(refus)).toContain(INTEGRATEUR);
  });

  it("SC-04b — un nom de domaine désigné dans un fichier du contenu est refusé, fichier nommé", () => {
    const refus = controlerLesFichiersVersionnes(
      fichiers({ chemin: "src/content/pages/accueil.md", texte: `Réalisé par ${DOMAINE}\n` }),
      [DOMAINE],
    );
    expect(messages(refus)).toContain("src/content/pages/accueil.md");
  });

  it("SC-04b — un fichier hors contenu est aussi refusé, et la recherche vaut dans un mot plus long", () => {
    const refus = controlerLesFichiersVersionnes(
      fichiers({ chemin: "wrangler.jsonc", texte: `{ "name": "x-${INTEGRATEUR}-prod" }` }),
      [INTEGRATEUR],
    );
    expect(messages(refus)).toContain("wrangler.jsonc");
  });

  it("SC-04c — un identifiant présent avec une autre casse provoque le même échec", () => {
    const refus = controlerLesFichiersVersionnes(
      fichiers({ chemin: "README.md", texte: `Contact : ${INTEGRATEUR.toUpperCase()}\n` }),
      [INTEGRATEUR],
    );
    expect(messages(refus)).toContain("README.md");
  });

  it("SC-04c — la casse du proscrit désigné est indifférente", () => {
    const refus = controlerLesFichiersVersionnes(
      fichiers({ chemin: "README.md", texte: `Contact : ${INTEGRATEUR}\n` }),
      [INTEGRATEUR.toUpperCase()],
    );
    expect(messages(refus)).toContain("README.md");
  });

  it("SC-04d — identifiants désignés absents partout : aucun refus à ce titre", () => {
    const refus = controlerLesFichiersVersionnes(
      fichiers({ chemin: "README.md", texte: "Un site vitrine.\n" }),
      [INTEGRATEUR, DOMAINE],
    );
    expect(refus).toEqual([]);
  });

  it("SC-04d — liste de proscrits vide : aucun refus", () => {
    const refus = controlerLesFichiersVersionnes(
      fichiers({ chemin: "README.md", texte: `${INTEGRATEUR}\n` }),
      [],
    );
    expect(refus).toEqual([]);
  });
});

describe("contrôle d’instance — valeurs à forme de clé", () => {
  it.each(Object.entries(cle))(
    "SC-04e — une valeur de forme %s fait échouer le contrôle en nommant fichier et ligne, sans reproduire la valeur",
    (_forme, valeur) => {
      const refus = controlerLesFichiersVersionnes(
        fichiers({ chemin: "config/ci.yml", texte: `a: 1\nb: 2\njeton: ${valeur}\n` }),
        [],
      );
      const sortie = messages(refus);
      expect(refus.length).toBeGreaterThan(0);
      expect(sortie).toContain("config/ci.yml");
      expect(sortie).toMatch(/\b3\b/);
      expect(sortie).not.toContain(valeur);
      for (let i = 0; i + 6 <= valeur.length; i++) {
        expect(sortie).not.toContain(valeur.slice(i, i + 6));
      }
    },
  );

  it("SC-04f — aucun fichier versionné ne porte de valeur de cette forme : aucun refus à ce titre", () => {
    const refus = controlerLesFichiersVersionnes(
      fichiers({ chemin: "README.md", texte: "ghp_ est un préfixe ; github_pat_ aussi.\nrien d'autre\n" }),
      [],
    );
    expect(refus).toEqual([]);
  });
});

/**
 * Le geste en ligne de commande (`scripts/livraison.mjs`) : lecture des fichiers versionnés par
 * l'accès reçu, lecture de `--proscrire`. Accès en mémoire, aucune commande lancée.
 */
interface Sortie {
  log: (m: string) => void;
  error: (m: string) => void;
}
type Acces = Record<string, (...args: string[]) => unknown>;
interface Livraison {
  controler: (
    depot: string,
    acces: Acces,
    sortie?: Sortie,
    proscrits?: string[],
  ) => Promise<{ code: number; refus: { champ: string; motif: string }[] }>;
  principal: (argv: string[], acces: Acces, sortie: Sortie) => Promise<number>;
}

async function livraison(): Promise<Livraison> {
  const module: Livraison = await import("../../scripts/livraison.mjs");
  return module;
}

function erreurDeLecture(code: string): Error {
  return Object.assign(new Error("lecture impossible"), { code });
}

/** Dépôt en mémoire : `textes` par chemin relatif ; une valeur `Error` est levée à la lecture. */
function depotEnMemoire(textes: Record<string, string | Error>) {
  const lus: string[] = [];
  const erreurs: string[] = [];
  const journal: string[] = [];
  const acces: Acces = {
    lire: (chemin) => {
      lus.push(chemin);
      const relatif = chemin.replace("/depot/", "");
      if (!Object.hasOwn(textes, relatif)) throw erreurDeLecture("ENOENT");
      const contenu = textes[relatif];
      if (contenu instanceof Error) throw contenu;
      return contenu;
    },
    lister: () => Object.keys(textes),
  };
  const sortie: Sortie = { log: (m) => journal.push(m), error: (m) => erreurs.push(m) };
  return { acces, sortie, lus, erreurs, journal };
}

describe("contrôle d’instance — le geste controler <dépôt> --proscrire", () => {
  it("SC-04b — le geste échoue (code 1) en nommant le fichier du contenu qui porte le domaine désigné", async () => {
    const { principal } = await livraison();
    const { acces, sortie, lus, erreurs } = depotEnMemoire({
      "instance.json": instance,
      "src/content/pages/accueil.md": `Réalisé par ${DOMAINE}\n`,
    });

    const code = await principal(["controler", "/depot", "--proscrire", `${DOMAINE},autre-fictif`], acces, sortie);

    expect(code).toBe(1);
    expect(erreurs.join("\n")).toContain("src/content/pages/accueil.md");
    expect(lus).toContain("/depot/src/content/pages/accueil.md");
  });

  it("SC-04d — sans identifiant désigné présent, le geste rend 0", async () => {
    const { principal } = await livraison();
    const { acces, sortie, erreurs } = depotEnMemoire({
      "instance.json": instance,
      "src/content/pages/accueil.md": "Un site vitrine.\n",
    });

    const code = await principal(["controler", "/depot", "--proscrire", `${DOMAINE},autre-fictif`], acces, sortie);

    expect(code).toBe(0);
    expect(erreurs).toEqual([]);
  });

  it("le contrôle n’ouvre aucun fichier pour composer les proscrits : seuls les fichiers versionnés sont lus", async () => {
    const { principal } = await livraison();
    const { acces, sortie, lus, erreurs } = depotEnMemoire({
      "instance.json": instance,
      "README.md": `Contact : ${INTEGRATEUR}\n`,
    });

    const code = await principal(["controler", "/depot", "--proscrire", INTEGRATEUR], acces, sortie);

    expect(code).toBe(1);
    expect(new Set(lus)).toEqual(new Set(["/depot/README.md", "/depot/instance.json"]));
    expect(erreurs.join("\n")).toContain(INTEGRATEUR);
  });

  it.each<[string, string[]]>([
    ["liste absente", ["controler", "/depot", "--proscrire"]],
    ["forme --proscrire=a", ["controler", "/depot", "--proscrire=a"]],
    ["liste réduite à une virgule", ["controler", "/depot", "--proscrire", ","]],
    ["option avant le dépôt", ["controler", "--proscrire", "a", "/depot"]],
    ["option inconnue", ["controler", "/depot", "--inconnue"]],
  ])("arguments invalides (%s) : le geste rend 2 sans rien lire", async (_nom, argv) => {
    const { principal } = await livraison();
    const { acces, sortie, lus, erreurs } = depotEnMemoire({ "instance.json": instance });

    const code = await principal(argv, acces, sortie);

    expect(code).toBe(2);
    expect(lus).toEqual([]);
    expect(erreurs.length).toBeGreaterThan(0);
  });

  it("un fichier versionné illisible (EACCES) est un refus qui nomme le fichier : le geste rend 1", async () => {
    const { controler } = await livraison();
    const { acces, sortie } = depotEnMemoire({
      "instance.json": instance,
      "README.md": "Un site vitrine.\n",
      "secret.txt": erreurDeLecture("EACCES"),
    });

    const verdict = await controler("/depot", acces, sortie, []);

    expect(verdict.code).toBe(1);
    expect(verdict.refus.map((r) => r.champ)).toEqual(["secret.txt"]);
    expect(verdict.refus[0]?.motif).toContain("EACCES");
    expect(verdict.refus[0]?.motif).not.toContain("lecture impossible");
  });

  it.each(["ENOENT", "EISDIR"])(
    "un chemin listé sans contenu à contrôler (%s) ne produit aucun refus : le geste rend 0",
    async (codeDErreur) => {
      const { controler } = await livraison();
      const { acces, sortie } = depotEnMemoire({
        "instance.json": instance,
        "disparu": erreurDeLecture(codeDErreur),
      });

      const verdict = await controler("/depot", acces, sortie, []);

      expect(verdict).toEqual({ code: 0, refus: [] });
    },
  );
});
