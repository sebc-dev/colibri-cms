/**
 * La composition de l'e-mail d'une demande de devis (change 012, ticket 07, ADR-0002, SEC-7).
 * Fonction pure (I2) : texte seul, jamais de HTML ; chaque valeur saisie reste derrière son étiquette
 * « Étiquette : valeur » sur une seule ligne, et un texte long est retiré ligne à ligne par « 2 espaces + > ».
 */
import type { ChampDeclare, FormulaireDeclare } from './declaration.ts';
import { formaterPrix } from './prix.ts';
import { totalDeLaSelection } from './total.ts';

export interface CourrielCompose {
  readonly objet: string;
  readonly texte: string;
}

const RETRAIT_TEXTE_LONG = '  > ';

// Retours à la ligne, séparateurs de ligne Unicode et caractères de contrôle.
const A_NEUTRALISER = /[\p{Cc}\u2028\u2029]+/gu;
const CONTROLE = /\p{Cc}/gu;

function surUneLigne(valeur: string): string {
  return valeur.replace(A_NEUTRALISER, ' ').trim();
}

function enLignes(valeur: string): string[] {
  return valeur
    .split(/\r\n|\r|\n|\u2028|\u2029|\u0085/)
    .map((ligne) => ligne.replace(CONTROLE, '').trimEnd());
}

function texteSaisi(valeurs: Readonly<Record<string, string | readonly string[]>>, id: string): string {
  const valeur = valeurs[id];
  return typeof valeur === 'string' ? valeur : '';
}

function lignesDuChoix(champ: ChampDeclare, choisies: readonly string[]): string[] {
  const options = (champ.options ?? []).filter((o) => choisies.includes(o.id));
  if (options.length === 0) return [];
  const rendu = options.map((o) =>
    champ.avecPrix && o.prix !== undefined
      ? `${surUneLigne(o.libelle)} (${formaterPrix(o.prix)} €)`
      : surUneLigne(o.libelle),
  );
  return [`${surUneLigne(champ.libelle)} : ${rendu.join(', ')}`];
}

function lignesDuTexte(champ: ChampDeclare, saisie: string): string[] {
  if (saisie.trim() === '') return [];
  const etiquette = surUneLigne(champ.libelle);
  if (champ.nature === 'texte-long') {
    return [`${etiquette} :`, ...enLignes(saisie).map((ligne) => `${RETRAIT_TEXTE_LONG}${ligne}`)];
  }
  return [`${etiquette} : ${surUneLigne(saisie)}`];
}

/** Compose l'objet et le texte de l'e-mail ; `total` est recalculé par l'appelant, en centimes. */
export function composerCourriel(
  formulaire: FormulaireDeclare,
  titrePage: string,
  valeurs: Readonly<Record<string, string | readonly string[]>>,
  total: number,
): CourrielCompose {
  const choix: string[] = [];
  const coordonnees: string[] = [];
  for (const champ of formulaire.champs) {
    if (champ.nature === 'choix-unique' || champ.nature === 'choix-multiple') {
      const v = valeurs[champ.id];
      choix.push(...lignesDuChoix(champ, Array.isArray(v) ? (v as string[]) : []));
    } else {
      coordonnees.push(...lignesDuTexte(champ, texteSaisi(valeurs, champ.id)));
    }
  }
  const aPrix = formulaire.champs.some((c) => c.avecPrix);
  const lignes = [
    `Formulaire : ${surUneLigne(formulaire.nom)}`,
    `Page : ${surUneLigne(titrePage)}`,
    ...choix,
    ...(aPrix ? [`Total indicatif : ${formaterPrix(total)} € (estimation non engageante)`] : []),
    ...coordonnees,
  ];
  return { objet: `Demande de devis — ${surUneLigne(formulaire.nom)}`, texte: lignes.join('\n') };
}

/** Le total d'une sélection de choix, recalculé côté serveur depuis la déclaration. */
export function totalDesValeurs(
  formulaire: FormulaireDeclare,
  valeurs: Readonly<Record<string, string | readonly string[]>>,
): number {
  const selection: Record<string, readonly string[]> = {};
  for (const [id, v] of Object.entries(valeurs)) if (typeof v !== 'string') selection[id] = v;
  return totalDeLaSelection(formulaire, selection);
}
