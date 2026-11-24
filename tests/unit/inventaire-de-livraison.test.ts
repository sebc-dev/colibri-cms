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
/** Le client sur le compte de la plateforme : une adresse, pas son nom de compte du dépôt. */
const ADRESSE_DU_CLIENT = "martin@boulangerie-martin.example";
const MEMBRE_TIERS = "tiers@exemple.fr";
const SECRETS_ATTENDUS = ["EXPEDITEUR_CODE_CONNEXION", "JETON_DEPOT", "JETON_ADRESSES_EMAIL", "COLIBRI_CLE_LECTURE_DEPOT"];
const JOUR = "2026-11-24";

function observations(surcharge: Partial<Observations> = {}): Observations {
  return {
    secretsPoses: ["JETON_DEPOT", "JETON_ADRESSES_EMAIL", "COLIBRI_CLE_LECTURE_DEPOT"],
    base: "colibri",
    declencheur: "17 4 * * 1",
    domaine: "boulangerie-martin.fr",
    client: CLIENT,
    clientDuCompte: ADRESSE_DU_CLIENT,
    membresDuCompte: [ADRESSE_DU_CLIENT],
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
      membresDuCompte: [ADRESSE_DU_CLIENT, MEMBRE_TIERS],
      collaborateursDuDepot: [CLIENT, AUTRE],
    });
    expect(ligneDe(texte, MEMBRE_TIERS)).toMatch(/à retirer/);
    expect(ligneDe(texte, AUTRE)).toMatch(/à retirer/);
    expect(ligneDe(texte, ADRESSE_DU_CLIENT)).toMatch(/membre du compte.*le client/);
    expect(ligneDe(texte, `| ${CLIENT} |`)).toMatch(/collaborateur du dépôt.*le client/);
  });

  it("SC-09f — le client est reconnu parmi les membres par son adresse, casse et espaces de bord ignorés, jamais par son nom de compte du dépôt", () => {
    const texte = compose({
      clientDuCompte: "  Martin@Boulangerie-Martin.example ",
      membresDuCompte: [ADRESSE_DU_CLIENT, CLIENT],
    });
    expect(ligneDe(texte, ADRESSE_DU_CLIENT)).toMatch(/le client/);
    expect(ligneDe(texte, `| membre du compte | ${CLIENT} |`)).toMatch(/à retirer/);
  });

  it("SC-09f — aucun autre que le client : rien n'est à retirer", () => {
    const texte = compose();
    expect(texte).not.toMatch(/tiers@exemple\.fr|integrateur-tiers/);
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

type Lecture = "secrets" | "bases" | "membres" | "collaborateurs";
interface Reponse {
  code: number;
  stdout: string;
  stderr: string;
}

function lectureDe(commande: string, args: string[]): Lecture {
  if (commande === "gh") return "collaborateurs";
  if (commande === "sh") return "membres";
  return args.includes("secret") ? "secrets" : "bases";
}

const REPONSES: Record<Lecture, string> = {
  collaborateurs: JSON.stringify([{ login: CLIENT }, { login: AUTRE }]),
  secrets: JSON.stringify(
    Object.entries(VALEURS_CONNUES).map(([name, value]) => ({ name, type: "secret_text", value })),
  ),
  bases: JSON.stringify([{ name: "colibri", uuid: "0123456789abcdef0123456789abcdef" }]),
  // Forme de l'API de la plateforme : les membres sont rendus par leur adresse.
  membres: JSON.stringify({
    success: true,
    result: [{ user: { email: ADRESSE_DU_CLIENT } }, { user: { email: MEMBRE_TIERS } }],
  }),
};

/** Sorties enregistrées ; `surcharge` remplace la réponse d'une seule lecture. */
function executeurEnregistre(surcharge: Partial<Record<Lecture, Partial<Reponse>>> = {}) {
  const lancees: CommandeLancee[] = [];
  const executer = (commande: string, args: string[]): Promise<Reponse> => {
    lancees.push({ commande, args });
    const lecture = lectureDe(commande, args);
    return Promise.resolve({ code: 0, stdout: REPONSES[lecture], stderr: "", ...surcharge[lecture] });
  };
  return { executer, lancees };
}

const INSTANCE = {
  domain: "boulangerie-martin.fr",
  senderAddress: "code@envoi.boulangerie-martin.fr",
  depotDePublication: `${CLIENT}/site`,
  compteCloudflare: "fedcba9876543210fedcba9876543210",
};

type Geste = (
  depot: string,
  adresseDuClient: string,
  acces: Record<string, unknown>,
  sortie?: { log: (m: string) => void; error: (m: string) => void },
) => Promise<{ code: number; chemin?: string }>;

/** Joue le geste sur des accès doublés et rend ce qu'il a écrit, dit et lancé. */
async function jouer(
  options: {
    instance?: Record<string, unknown>;
    adresse?: string;
    surcharge?: Partial<Record<Lecture, Partial<Reponse>>>;
  } = {},
) {
  const { inventaire } = (await import("../../scripts/livraison.mjs")) as { inventaire: Geste };
  const { executer, lancees } = executeurEnregistre(options.surcharge);
  const ecritures: { chemin: string; contenu: string }[] = [];
  const erreurs: string[] = [];
  const resultat = await inventaire(
    "/depot",
    options.adresse ?? ADRESSE_DU_CLIENT,
    {
      lire: () => Promise.resolve(JSON.stringify(options.instance ?? INSTANCE)),
      executer,
      ecrire: (chemin: string, contenu: string) => {
        ecritures.push({ chemin, contenu });
        return Promise.resolve();
      },
      maintenant: () => new Date("2026-11-24T10:00:00Z"),
    },
    { log: () => undefined, error: (m: string) => erreurs.push(m) },
  );
  return { resultat, ecritures, erreurs, lancees };
}

describe("le geste inventaire de l'outil de livraison", () => {
  it("SC-09b — le fichier écrit ne porte aucune valeur de clé posée, ni fragment, et ne touche pas au code de secours", async () => {
    const { resultat, ecritures, lancees } = await jouer();
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

  it("SC-09f — le geste inventaire porte les membres du compte relevés et désigne à retirer un membre qui n'est pas le client", async () => {
    const { resultat, ecritures } = await jouer();
    expect(resultat.code).toBe(0);
    const texte = ecritures[0].contenu;
    expect(ligneDe(texte, MEMBRE_TIERS)).toMatch(/membre du compte.*à retirer/);
    expect(ligneDe(texte, ADRESSE_DU_CLIENT)).toMatch(/membre du compte.*le client/);
    expect(ligneDe(texte, `| ${CLIENT} |`)).toMatch(/collaborateur du dépôt.*le client/);
  });

  it.each<[string, Lecture, RegExp]>([
    ["wrangler secret list", "secrets", /secrets posés/],
    ["wrangler d1 list", "bases", /bases/],
    ["le relevé des membres", "membres", /membres du compte/],
    ["gh api collaborators", "collaborateurs", /collaborateurs du dépôt/],
  ])("SC-09f — une lecture de la plateforme qui échoue (%s) : aucun inventaire écrit", async (_nom, lecture, motif) => {
    const { resultat, ecritures, erreurs } = await jouer({ surcharge: { [lecture]: { code: 1, stdout: "" } } });
    expect(resultat.code).toBe(1);
    expect(ecritures).toHaveLength(0);
    expect(erreurs.join("\n")).toMatch(motif);
  });

  it.each<[string, Lecture, string]>([
    ["une sortie qui n'est pas du JSON", "secrets", "Erreur : connexion refusée"],
    [
      "une réponse d'erreur de la plateforme rendue avec un code 0",
      "membres",
      JSON.stringify({ success: false, errors: [{ code: 10000 }], result: null }),
    ],
    ["un membre sans adresse", "membres", JSON.stringify({ success: true, result: [{ user: {} }] })],
  ])("SC-09f — %s : la lecture est illisible, aucun inventaire écrit", async (_nom, lecture, stdout) => {
    const { resultat, ecritures, erreurs } = await jouer({ surcharge: { [lecture]: { stdout } } });
    expect(resultat.code).toBe(1);
    expect(ecritures).toHaveLength(0);
    expect(erreurs.length).toBeGreaterThan(0);
  });

  it.each<[string, Record<string, unknown>, RegExp]>([
    ["compteCloudflare", { ...INSTANCE, compteCloudflare: undefined }, /compteCloudflare/],
    ["depotDePublication", { ...INSTANCE, depotDePublication: undefined }, /depotDePublication/],
  ])("SC-09f — un fichier d'instance sans %s : aucune commande lancée, aucun inventaire écrit", async (_champ, instance, motif) => {
    const { resultat, ecritures, erreurs, lancees } = await jouer({ instance });
    expect(resultat.code).toBe(1);
    expect(lancees).toHaveLength(0);
    expect(ecritures).toHaveLength(0);
    expect(erreurs.join("\n")).toMatch(motif);
  });

  it.each(["", "boulangerie-martin", "martin@"])(
    "SC-09f — une adresse du client mal formée (« %s ») : aucune commande lancée, aucun inventaire écrit",
    async (adresse) => {
      const { resultat, ecritures, erreurs, lancees } = await jouer({ adresse });
      expect(resultat.code).toBe(1);
      expect(lancees).toHaveLength(0);
      expect(ecritures).toHaveLength(0);
      expect(erreurs.length).toBeGreaterThan(0);
    },
  );

  it("SC-09f — le geste sans adresse du client, en ligne de commande, rend l'usage et ne lance rien", async () => {
    const { principal } = (await import("../../scripts/livraison.mjs")) as {
      principal: (
        argv: string[],
        acces: Record<string, unknown>,
        sortie: { log: (m: string) => void; error: (m: string) => void },
      ) => Promise<number>;
    };
    const { executer, lancees } = executeurEnregistre();
    const erreurs: string[] = [];
    const code = await principal(
      ["inventaire", "/depot"],
      { lire: () => Promise.resolve(JSON.stringify(INSTANCE)), executer, ecrire: () => Promise.resolve() },
      { log: () => undefined, error: (m: string) => erreurs.push(m) },
    );
    expect(code).toBe(2);
    expect(lancees).toHaveLength(0);
    expect(erreurs.join("\n")).toMatch(/inventaire <dépôt> <adresse du client>/);
  });
});
