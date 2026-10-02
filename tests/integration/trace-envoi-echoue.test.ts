/**
 * Ticket 02 de 007 — Un envoi de code qui échoue laisse une trace pour
 * l'exploitation.
 *
 * Oracle (ADR-0014) : la liaison `send_email` réelle de la plateforme locale
 * refuse tout destinataire différent de sa `destination_address`
 * (`editrice@example.com`). Semer une adresse autorisée différente fait donc
 * échouer l'envoi réel, sans double ; semer celle de la liaison le fait
 * aboutir. La liaison n'est enveloppée que par un relais qui délègue au réel
 * et signale la fin de l'envoi, pour savoir quand lire la sortie console.
 * La trace se lit dans `console.error` ; le code, haché en D1, est retrouvé
 * par les octets que le moteur tire pour l'engendrer.
 */
import { env, exports } from "cloudflare:workers";
import { it, expect, afterEach, vi } from "vitest";

const NOM_COOKIE_APPAREIL = "identifiant-appareil";
const CLE_LIAISON = "EXPEDITEUR_CODE_CONNEXION";
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ADRESSE_DE_LA_LIAISON = "editrice@example.com";
const ADRESSE_REFUSEE_PAR_LA_LIAISON = "autre-adresse-autorisee@example.com";

interface DBLike {
  exec(query: string): Promise<unknown>;
  prepare(query: string): {
    bind(...valeurs: unknown[]): { run(): Promise<unknown> };
    run(): Promise<unknown>;
  };
}
interface Liaison {
  send(message: unknown): Promise<unknown>;
}

const enveloppe = env as unknown as Record<string, unknown> & { DB: DBLike };
const liaisonReelle = enveloppe[CLE_LIAISON] as Liaison;

function separerRequetes(sql: string): string[] {
  return sql
    .split("\n")
    .map((ligne) => ligne.replace(/--.*/, ""))
    .join("\n")
    .split(";")
    .map((requete) => requete.trim())
    .filter(Boolean);
}

let migrationAppliquee: Promise<void> | null = null;
async function assurerSchema(): Promise<DBLike> {
  migrationAppliquee ??= (async () => {
    const module =
      await import("../../migrations/0002_adresses_autorisees_et_codes_connexion.sql?raw");
    for (const requete of separerRequetes(module.default)) {
      await enveloppe.DB.prepare(requete).run();
    }
  })();
  await migrationAppliquee;
  return enveloppe.DB;
}

afterEach(async () => {
  vi.restoreAllMocks();
  enveloppe[CLE_LIAISON] = liaisonReelle;
  await enveloppe.DB.prepare("delete from codes_connexion").run();
  await enveloppe.DB.prepare("delete from adresses_autorisees").run();
});

/** Relais vers la liaison réelle : délègue, puis signale la fin de l'envoi. */
function relayerLaLiaisonReelle(): {
  envoiTermine: Promise<void>;
  appels: () => number;
} {
  let appels = 0;
  let fini: () => void;
  const envoiTermine = new Promise<void>((resolve) => {
    fini = resolve;
  });
  enveloppe[CLE_LIAISON] = {
    async send(message: unknown): Promise<unknown> {
      appels += 1;
      try {
        return await liaisonReelle.send(message);
      } finally {
        fini();
      }
    },
  } satisfies Liaison;
  return { envoiTermine, appels: () => appels };
}

/** Relève les codes que le moteur engendre (huit octets tirés → huit signes). */
function releverLesCodesEngendres(): string[] {
  const codes: string[] = [];
  const original = crypto.getRandomValues.bind(crypto);
  vi.spyOn(crypto, "getRandomValues").mockImplementation(((
    tableau: Uint8Array<ArrayBuffer>,
  ) => {
    const rempli = original(tableau);
    if (rempli instanceof Uint8Array && rempli.length === 8) {
      codes.push(
        Array.from(rempli, (octet) => ALPHABET[octet % ALPHABET.length]).join(
          "",
        ),
      );
    }
    return rempli;
  }) as typeof crypto.getRandomValues);
  return codes;
}

async function soumettreAdresse(adresse: string): Promise<Response> {
  const identifiant = crypto.randomUUID();
  return exports.default.fetch(
    new Request("https://example.com/admin/connexion", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://example.com",
        cookie: `${NOM_COOKIE_APPAREIL}=${identifiant}`,
      },
      body: `adresse=${encodeURIComponent(adresse)}`,
    }),
  );
}

function sortieConsole(espion: { mock: { calls: unknown[][] } }): string {
  return espion.mock.calls
    .flat()
    .map((x) =>
      x instanceof Error
        ? `${x.name} ${x.message} ${x.stack ?? ""}`
        : String(x),
    )
    .join("\n");
}

const laisserLeCatchSeResoudre = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 100));

it("SC-02a — un envoi qui échoue écrit une trace d’erreur qui ne porte pas le code", async () => {
  const db = await assurerSchema();
  await db
    .prepare("insert into adresses_autorisees (adresse) values (?1)")
    .bind(ADRESSE_REFUSEE_PAR_LA_LIAISON)
    .run();
  const codes = releverLesCodesEngendres();
  const relais = relayerLaLiaisonReelle();
  const erreurs = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  const reponse = await soumettreAdresse(ADRESSE_REFUSEE_PAR_LA_LIAISON);
  await relais.envoiTermine;
  await laisserLeCatchSeResoudre();

  expect(reponse.status).toBe(200);
  expect(relais.appels()).toBe(1);
  expect(erreurs).toHaveBeenCalledTimes(1);
  const trace = sortieConsole(erreurs);
  expect(trace.length).toBeGreaterThan(0);
  expect(codes).toHaveLength(1);
  expect(trace).not.toContain(codes[0]);
  expect(trace).not.toContain(ADRESSE_REFUSEE_PAR_LA_LIAISON);
});

it("SC-02b — un envoi qui aboutit n’écrit aucune trace d’échec", async () => {
  const db = await assurerSchema();
  await db
    .prepare("insert into adresses_autorisees (adresse) values (?1)")
    .bind(ADRESSE_DE_LA_LIAISON)
    .run();
  const relais = relayerLaLiaisonReelle();
  const erreurs = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  const reponse = await soumettreAdresse(ADRESSE_DE_LA_LIAISON);
  await relais.envoiTermine;
  await laisserLeCatchSeResoudre();

  expect(reponse.status).toBe(200);
  expect(relais.appels()).toBe(1);
  expect(erreurs).not.toHaveBeenCalled();
});
