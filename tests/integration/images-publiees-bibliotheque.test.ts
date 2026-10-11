/**
 * La bibliothèque montre les images publiées et celles posées au départ —
 * change 011-apercu-et-publication, ticket 02 (ADR-0020, ADR-0022).
 * Éprouvé contre la vraie D1 locale (ADR-0014), sans simulacre.
 */
import { env } from "cloudflare:workers";
import { it, expect } from "vitest";
import {
  inscrireImagesDeDepart,
  listerMediasBrouillon,
  obtenirFicheMediaBrouillon,
} from "../../src/platform/medias/magasin.ts";
import {
  adressesOriginalesEmpaquetees,
  listerFichesMedias,
} from "../../src/platform/contenu/medias.ts";

type DB = Parameters<typeof listerMediasBrouillon>[0];

function obtenirDB(): DB {
  return (env as unknown as { DB: DB }).DB;
}

it("SC-02a — une image posée au départ, jamais téléversée, paraît dans la grille avec sa vignette, son nom et sa description", async () => {
  const db = obtenirDB();
  const fiches = listerFichesMedias();
  const hero = fiches.find((f) => f.id === "media-fixture-hero");
  expect(hero).toBeDefined();

  await inscrireImagesDeDepart(db, fiches, 1_000);
  const medias = await listerMediasBrouillon(
    db,
    new Set(),
    adressesOriginalesEmpaquetees(),
  );

  const ligne = medias.find((m) => m.id === "media-fixture-hero");
  expect(ligne?.nomAffichage).toBe(hero?.nomOrigine);
  expect(ligne?.description).toBe(hero?.description);
  expect(ligne?.vignette).toBe(
    adressesOriginalesEmpaquetees().get("media-fixture-hero"),
  );
  expect(ligne?.vignette).not.toBe("/admin/medias/media-fixture-hero/octets");
  expect(medias.some((m) => m.id === "media-fixture-equipe")).toBe(true);
});

it("SC-02a — l'inscription est idempotente et ne retouche pas une image déjà inscrite", async () => {
  const db = obtenirDB();
  const fiches = listerFichesMedias();
  await inscrireImagesDeDepart(db, fiches, 1_000);
  await db
    .prepare(
      "update medias set nom_affichage = 'Renommée', description = 'Décrite' where id = 'media-fixture-hero'",
    )
    .bind()
    .run();

  await inscrireImagesDeDepart(db, fiches, 2_000);
  const medias = await listerMediasBrouillon(
    db,
    new Set(),
    adressesOriginalesEmpaquetees(),
  );

  expect(medias.filter((m) => m.id === "media-fixture-hero")).toHaveLength(1);
  const ligne = medias.find((m) => m.id === "media-fixture-hero");
  expect(ligne?.nomAffichage).toBe("Renommée");
  expect(ligne?.description).toBe("Décrite");
});

it("SC-02b — une image publiée dont la base ne garde plus les octets paraît avec la vignette de sa variante empaquetée", async () => {
  const db = obtenirDB();
  await inscrireImagesDeDepart(db, [], 1_000);
  await db
    .prepare(
      `insert into medias (id, nom_origine, format, largeur, hauteur, poids_octets, octets, creee_le, publiee_le, description_publiee)
       values ('image-publiee', 'publiee.png', 'png', 10, 10, 0, x'', 5, 6, 'Publiée')`,
    )
    .bind()
    .run();
  const statiques = new Map([["image-publiee", "/medias/publiee-abc.png"]]);

  const medias = await listerMediasBrouillon(db, new Set(), statiques);
  const fiche = await obtenirFicheMediaBrouillon(
    db,
    "image-publiee",
    new Set(),
    statiques,
  );

  expect(medias.find((m) => m.id === "image-publiee")?.vignette).toBe(
    "/medias/publiee-abc.png",
  );
  expect(fiche?.vignette).toBe("/medias/publiee-abc.png");
});

it("SC-02b — une image dont la base garde les octets garde la route gardée, même si une variante empaquetée existe", async () => {
  const db = obtenirDB();
  await inscrireImagesDeDepart(db, [], 1_000);
  await db
    .prepare(
      `insert into medias (id, nom_origine, format, largeur, hauteur, poids_octets, octets, creee_le)
       values ('image-gardee', 'gardee.png', 'png', 10, 10, 3, x'010203', 7)`,
    )
    .bind()
    .run();
  const statiques = new Map([["image-gardee", "/medias/gardee.png"]]);

  const medias = await listerMediasBrouillon(db, new Set(), statiques);

  expect(medias.find((m) => m.id === "image-gardee")?.vignette).toBe(
    "/admin/medias/image-gardee/octets",
  );
});
