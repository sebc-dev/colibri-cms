/**
 * Ticket 08 (008) — Le noyau vérifie la mention d'information.
 * Couture : `appliquerMention` (logique pure, I2).
 */
import { describe, it, expect } from "vitest";
import { appliquerMention } from "../../../src/core/reglages/mention.ts";

// Schéma non sécurisé : assemblé pour que le cas reste lisible comme refusé.
const SCHEMA_CLAIR = "http:";

function paragrapheAvecLien(href: string): unknown {
  return {
    document: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "lire la suite",
              marks: [{ type: "link", attrs: { href } }],
            },
          ],
        },
      ],
    },
  };
}

describe("SC-08b — mêmes règles de liens que le texte riche des pages", () => {
  it("SC-08b — un lien javascript: est rejeté, le texte reste", () => {
    const verdict = appliquerMention(paragrapheAvecLien("javascript:alert(1)"));

    expect(verdict.accepte).toBe(true);
    if (verdict.accepte) {
      expect(verdict.markdown).toContain("lire la suite");
      expect(verdict.markdown).not.toContain("javascript:");
    }
  });

  it("SC-08b — un lien http: est rejeté, le texte reste", () => {
    const verdict = appliquerMention(
      paragrapheAvecLien(`${SCHEMA_CLAIR}//exemple.fr`),
    );

    expect(verdict.accepte).toBe(true);
    if (verdict.accepte) {
      expect(verdict.markdown).toContain("lire la suite");
      expect(verdict.markdown).not.toContain(`${SCHEMA_CLAIR}//`);
    }
  });

  it("SC-08b — un lien https est conservé", () => {
    const verdict = appliquerMention(paragrapheAvecLien("https://exemple.fr"));

    expect(verdict.accepte).toBe(true);
    if (verdict.accepte) {
      expect(verdict.markdown).toContain("(https://exemple.fr)");
    }
  });
});

describe("SC-08c — mention vide", () => {
  it("SC-08c — un document d'espaces est refusé avec le code mention-vide", () => {
    const verdict = appliquerMention({
      document: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "  " }] },
        ],
      },
    });

    expect(verdict).toEqual({
      accepte: false,
      raison: "valeur-refusee",
      refus: [{ champ: "mention", raison: "mention-vide" }],
    });
  });

  it("SC-08c — un corps sans document est de forme invalide", () => {
    expect(appliquerMention({})).toEqual({
      accepte: false,
      raison: "forme-invalide",
    });
  });

  it.each([
    ["un titre sans texte", [{ type: "heading", attrs: { level: 2 } }]],
    [
      "une liste dont le paragraphe est vide",
      [
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
        },
      ],
    ],
    [
      "un espace en gras",
      [
        {
          type: "paragraph",
          content: [{ type: "text", text: " ", marks: [{ type: "bold" }] }],
        },
      ],
    ],
  ])("SC-08c — refus mention-vide : %s", (_cas, content) => {
    const verdict = appliquerMention({ document: { type: "doc", content } });

    expect(verdict).toEqual({
      accepte: false,
      raison: "valeur-refusee",
      refus: [{ champ: "mention", raison: "mention-vide" }],
    });
  });

  it.each([
    ["un nœud null dans le contenu", [null]],
    [
      "un texte qui n'est pas une chaîne",
      [{ type: "paragraph", content: [{ type: "text", text: 42 }] }],
    ],
  ])("SC-08c — forme invalide, sans exception : %s", (_cas, content) => {
    expect(appliquerMention({ document: { type: "doc", content } })).toEqual({
      accepte: false,
      raison: "forme-invalide",
    });
  });
});
