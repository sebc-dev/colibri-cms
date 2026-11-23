/**
 * Ticket 07 (020-deploiement-instance-client) — le geste `base` de l'outil de
 * livraison crée la base `colibri` dans le compte du fichier d'instance, par une
 * enveloppe d'accès à la plateforme. L'exécuteur de commandes est doublé par des
 * sorties enregistrées de wrangler : la frontière est mockée, pas la logique.
 */
import { describe, it, expect } from "vitest";
import { creerLaBase } from "../../src/platform/instance/plateforme-de-livraison.ts";

const COMPTE = "fedcba9876543210fedcba9876543210";
const COMPTE_PAR_DEFAUT = "11111111111111111111111111111111";

interface CommandeLancee {
  commande: string;
  args: string[];
  compte: string | undefined;
}

interface Sortie {
  code: number;
  stdout: string;
  stderr: string;
}

function instance(retirer: string[] = []): string {
  const contenu: Record<string, string> = {
    domain: "boulangerie-martin.fr",
    senderAddress: "code@envoi.boulangerie-martin.fr",
    depotDePublication: "boulangerie-martin/site",
    compteCloudflare: COMPTE,
  };
  return JSON.stringify(
    Object.fromEntries(Object.entries(contenu).filter(([nom]) => !retirer.includes(nom))),
  );
}

function lireInstance(texte: string): (chemin: string, encodage: "utf8") => Promise<string> {
  return (chemin) => {
    if (!chemin.endsWith("instance.json")) return Promise.reject(new Error(`lecture inattendue : ${chemin}`));
    return Promise.resolve(texte);
  };
}

function executeurEnregistre(reponses: { liste: Sortie; creation?: Sortie }) {
  const lancees: CommandeLancee[] = [];
  const executer = (
    commande: string,
    args: string[],
    env: Record<string, string | undefined>,
  ): Promise<Sortie> => {
    lancees.push({ commande, args, compte: env.CLOUDFLARE_ACCOUNT_ID });
    if (args.includes("list")) return Promise.resolve(reponses.liste);
    if (args.includes("create")) {
      return Promise.resolve(reponses.creation ?? { code: 0, stdout: "", stderr: "" });
    }
    return Promise.reject(new Error(`commande inattendue : ${args.join(" ")}`));
  };
  return { executer, lancees };
}

const listeVide: Sortie = { code: 0, stdout: "[]", stderr: "" };
const listeAvecColibri: Sortie = {
  code: 0,
  stdout: JSON.stringify([
    { uuid: "aaaaaaaa-0000-0000-0000-000000000001", name: "autre-base" },
    { uuid: "aaaaaaaa-0000-0000-0000-000000000002", name: "colibri" },
  ]),
  stderr: "",
};
const accesRefuse: Sortie = {
  code: 1,
  stdout: "",
  stderr: "✘ [ERROR] A request to the Cloudflare API failed. Authentication error [code: 10000]",
};

const estEcriture = (c: CommandeLancee): boolean => !c.args.includes("list");

describe("livraison — geste base", () => {
  it("SC-07a — sur un compte sans base, la base colibri est créée dans ce compte", async () => {
    const { executer, lancees } = executeurEnregistre({ liste: listeVide });

    const resultat = await creerLaBase("/depot", lireInstance(instance()), executer);

    expect(resultat.code).toBe(0);
    const creations = lancees.filter((c) => c.args.includes("create"));
    expect(creations).toHaveLength(1);
    expect(creations[0]?.args).toContain("colibri");
    expect(creations[0]?.compte).toBe(COMPTE);
  });

  it("SC-07a — une liste qui ne porte que d'autres bases ne suffit pas : colibri est créée", async () => {
    const autres: Sortie = {
      code: 0,
      stdout: JSON.stringify([{ uuid: "aaaaaaaa-0000-0000-0000-000000000001", name: "colibri-recette" }]),
      stderr: "",
    };
    const { executer, lancees } = executeurEnregistre({ liste: autres });

    await creerLaBase("/depot", lireInstance(instance()), executer);

    expect(lancees.filter((c) => c.args.includes("create"))).toHaveLength(1);
  });

  it("SC-07b — sur un compte qui porte déjà colibri, aucune base n'est créée et l'outil le dit", async () => {
    const { executer, lancees } = executeurEnregistre({ liste: listeAvecColibri });

    const resultat = await creerLaBase("/depot", lireInstance(instance()), executer);

    expect(resultat.code).toBe(0);
    expect(lancees.filter(estEcriture)).toEqual([]);
    expect(resultat.message).toMatch(/existe déjà/);
  });

  it("SC-07c — toute commande part avec le compte du fichier d'instance, malgré le compte par défaut de la connexion", async () => {
    const { executer, lancees } = executeurEnregistre({ liste: listeVide });
    const memoire = globalThis.process.env.CLOUDFLARE_ACCOUNT_ID;
    globalThis.process.env.CLOUDFLARE_ACCOUNT_ID = COMPTE_PAR_DEFAUT;
    try {
      await creerLaBase("/depot", lireInstance(instance()), executer);
    } finally {
      if (memoire === undefined) delete globalThis.process.env.CLOUDFLARE_ACCOUNT_ID;
      else globalThis.process.env.CLOUDFLARE_ACCOUNT_ID = memoire;
    }

    expect(lancees.length).toBeGreaterThan(0);
    expect(lancees.map((c) => c.compte)).toEqual(lancees.map(() => COMPTE));
  });

  it("SC-07d — sans accès au compte, le geste échoue en le disant et aucune écriture ne part", async () => {
    const { executer, lancees } = executeurEnregistre({ liste: accesRefuse });

    const resultat = await creerLaBase("/depot", lireInstance(instance()), executer);

    expect(resultat.code).not.toBe(0);
    expect(resultat.message).toContain(COMPTE);
    expect(resultat.message).toMatch(/accès/);
    expect(lancees.filter(estEcriture)).toEqual([]);
  });

  it("SC-07e — sans compteCloudflare, le geste échoue en nommant le champ et aucune commande ne part", async () => {
    const { executer, lancees } = executeurEnregistre({ liste: listeVide });

    const resultat = await creerLaBase("/depot", lireInstance(instance(["compteCloudflare"])), executer);

    expect(resultat.code).not.toBe(0);
    expect(resultat.message).toContain("compteCloudflare");
    expect(lancees).toEqual([]);
  });
});
