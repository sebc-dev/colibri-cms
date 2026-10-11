/**
 * Le dépôt simulé en mémoire — le seul double du change 011 (ticket 12,
 * design D8). Il implémente le port `Forge` (`src/core/publication/forge.ts`)
 * et rien d'autre ; on mocke la frontière, jamais `depot.ts`.
 *
 * Forme du port attendue par ces tests (`forge.ts` la porte) :
 *   - `ResultatForge<T>` = `{ ok: true, valeur: T } | { ok: false, issue }` ;
 *   - `IssueForge` = `refusee-pas-avance-rapide | acces-refuse | injoignable | introuvable` ;
 *   - `EntreeArbre` = `{ chemin, contenu }` (texte inliné) ou `{ chemin, sha }`
 *     (`sha: null` supprime le chemin) ;
 *   - `lireRef(ref)`, `lireCommit(sha)`, `creerBlob(base64)`,
 *     `creerArbre({ baseArbre?, entrees })`, `creerCommit({ message, arbre, parents })`,
 *     `deplacerRef(ref, sha, force)`, `creerRef(ref, sha)`.
 *
 * Fidélité : les blobs sont adressés par leur identifiant git réel
 * (SHA-1 de `blob <taille>\0<octets>`, par `crypto.subtle`) ; deux contenus
 * identiques donnent le même arbre ; une écriture hors avance rapide est
 * refusée tant que `force` n'est pas demandé.
 */
import type {
  CommitLu,
  EntreeArbre,
  Forge,
  IssueForge,
  ResultatForge,
} from "../../../src/core/publication/forge.ts";

const encodeur = new TextEncoder();
const decodeur = new TextDecoder();

async function sha1(octets: Uint8Array<ArrayBuffer>): Promise<string> {
  const condensat = await crypto.subtle.digest("SHA-1", octets);
  return [...new Uint8Array(condensat)].map((o) => o.toString(16).padStart(2, "0")).join("");
}

/** L'identifiant git réel d'un blob : SHA-1 de `blob <taille>\0<octets>`. */
export async function shaBlobGit(octets: Uint8Array<ArrayBuffer>): Promise<string> {
  const entete = encodeur.encode(`blob ${String(octets.byteLength)}\0`);
  const tout = new Uint8Array(entete.byteLength + octets.byteLength);
  tout.set(entete, 0);
  tout.set(octets, entete.byteLength);
  return sha1(tout);
}

function ok<T>(valeur: T): ResultatForge<T> {
  return { ok: true, valeur };
}

function echec<T>(issue: IssueForge): ResultatForge<T> {
  return { ok: false, issue };
}

function depuisBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binaire = atob(base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i += 1) octets[i] = binaire.charCodeAt(i);
  return octets;
}

/** Ordre binaire, unité par unité — jamais `localeCompare`, qui dépend de la langue. */
function comparerBinaire(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

type Arbre = ReadonlyMap<string, string>;

export const REF_PRINCIPALE = "refs/heads/main";
export const REF_MEDIA = "refs/heads/media";

export class ForgeEnMemoire implements Forge {
  private readonly blobs = new Map<string, Uint8Array<ArrayBuffer>>();
  private readonly arbres = new Map<string, Arbre>();
  private readonly commits = new Map<string, CommitLu>();
  private readonly refs = new Map<string, string>();
  private compteurCommits = 0;

  private avanceAvantEcriture: Record<string, string> | null = null;
  private reponsePerdue: IssueForge | null = null;
  private refusRestants = 0;
  private panne: IssueForge | null = null;

  /** Les appels reçus, dans l'ordre (nom de méthode). */
  readonly appels: string[] = [];
  /** Nombre de déplacements demandés avec `force: true`. */
  deplacementsForces = 0;
  /** Nombre de commits créés par le port (hors commits injectés). */
  commitsCrees = 0;

  /** Un dépôt dont la branche principale porte `fichiers` en un commit racine. */
  static async creer(fichiers: Readonly<Record<string, string>>): Promise<ForgeEnMemoire> {
    const forge = new ForgeEnMemoire();
    const arbre = await forge.batirArbre(undefined, Object.entries(fichiers).map(([chemin, contenu]) => ({ chemin, contenu })));
    const sha = await forge.enregistrerCommit("commit initial", arbre, []);
    forge.refs.set(REF_PRINCIPALE, sha);
    return forge;
  }

  // --- injections -------------------------------------------------------

  /** Avant la prochaine écriture, la branche avance d'un commit concurrent portant `fichiers`. */
  avancerAvantLaProchaineEcriture(fichiers: Readonly<Record<string, string>>): void {
    this.avanceAvantEcriture = { ...fichiers };
  }

  /** La prochaine écriture aboutit, mais sa réponse se perd (l'appelant reçoit `issue`). */
  perdreLaReponseDeLaProchaineEcriture(issue: IssueForge = "injoignable"): void {
    this.reponsePerdue = issue;
  }

  /** Les `n` prochaines écritures sont refusées comme « pas une avance rapide », sans rien changer. */
  refuserLesProchainesEcritures(n: number): void {
    this.refusRestants = n;
  }

  /** Tout appel échoue avec `issue` (accès retiré, réseau coupé…). */
  tomberEnPanne(issue: IssueForge): void {
    this.panne = issue;
  }

  // --- observation ------------------------------------------------------

  /** Les fichiers (texte) de la branche principale. */
  fichiers(): ReadonlyMap<string, string> {
    const sha = this.refs.get(REF_PRINCIPALE);
    const commit = sha === undefined ? undefined : this.commits.get(sha);
    const arbre = commit === undefined ? undefined : this.arbres.get(commit.arbre);
    const texte = new Map<string, string>();
    for (const [chemin, shaBlob] of arbre ?? []) {
      const octets = this.blobs.get(shaBlob);
      if (octets !== undefined) texte.set(chemin, decodeur.decode(octets));
    }
    return texte;
  }

  /** Les octets d'un fichier d'une branche (principale par défaut), `undefined` s'il est absent. */
  octets(chemin: string, ref: string = REF_PRINCIPALE): Uint8Array<ArrayBuffer> | undefined {
    const sha = this.refs.get(ref);
    const commit = sha === undefined ? undefined : this.commits.get(sha);
    const shaBlob = commit === undefined ? undefined : this.arbres.get(commit.arbre)?.get(chemin);
    return shaBlob === undefined ? undefined : this.blobs.get(shaBlob);
  }

  /** Les chemins d'une branche (principale par défaut), en ordre binaire. */
  chemins(ref: string = REF_PRINCIPALE): readonly string[] {
    const sha = this.refs.get(ref);
    const commit = sha === undefined ? undefined : this.commits.get(sha);
    const arbre = commit === undefined ? undefined : this.arbres.get(commit.arbre);
    return [...(arbre?.keys() ?? [])].sort(comparerBinaire);
  }

  /** Les commits d'une branche (principale par défaut), du plus récent au plus ancien. */
  historique(ref: string = REF_PRINCIPALE): readonly CommitLu[] {
    const suite: CommitLu[] = [];
    let courant = this.refs.get(ref);
    while (courant !== undefined) {
      const commit = this.commits.get(courant);
      if (commit === undefined) break;
      suite.push(commit);
      courant = commit.parents[0];
    }
    return suite;
  }

  // --- le port ----------------------------------------------------------

  lireRef(ref: string): Promise<ResultatForge<{ readonly sha: string }>> {
    this.appels.push("lireRef");
    if (this.panne !== null) return Promise.resolve(echec(this.panne));
    const sha = this.refs.get(ref);
    return Promise.resolve(sha === undefined ? echec("introuvable") : ok({ sha }));
  }

  lireCommit(sha: string): Promise<ResultatForge<CommitLu>> {
    this.appels.push("lireCommit");
    if (this.panne !== null) return Promise.resolve(echec(this.panne));
    const commit = this.commits.get(sha);
    return Promise.resolve(commit === undefined ? echec("introuvable") : ok(commit));
  }

  async creerBlob(base64: string): Promise<ResultatForge<{ readonly sha: string }>> {
    this.appels.push("creerBlob");
    if (this.panne !== null) return echec(this.panne);
    const octets = depuisBase64(base64);
    const sha = await shaBlobGit(octets);
    this.blobs.set(sha, octets);
    return ok({ sha });
  }

  async creerArbre(demande: {
    readonly baseArbre?: string;
    readonly entrees: readonly EntreeArbre[];
  }): Promise<ResultatForge<{ readonly sha: string }>> {
    this.appels.push("creerArbre");
    if (this.panne !== null) return echec(this.panne);
    if (demande.baseArbre !== undefined && !this.arbres.has(demande.baseArbre)) return echec("introuvable");
    return ok({ sha: await this.batirArbre(demande.baseArbre, demande.entrees) });
  }

  async creerCommit(demande: {
    readonly message: string;
    readonly arbre: string;
    readonly parents: readonly string[];
  }): Promise<ResultatForge<{ readonly sha: string }>> {
    this.appels.push("creerCommit");
    if (this.panne !== null) return echec(this.panne);
    if (!this.arbres.has(demande.arbre)) return echec("introuvable");
    this.commitsCrees += 1;
    return ok({ sha: await this.enregistrerCommit(demande.message, demande.arbre, demande.parents) });
  }

  async deplacerRef(ref: string, sha: string, force: boolean): Promise<ResultatForge<null>> {
    this.appels.push("deplacerRef");
    if (this.panne !== null) return echec(this.panne);
    if (force) this.deplacementsForces += 1;
    await this.jouerAvanceConcurrente();
    if (!this.refs.has(ref) || !this.commits.has(sha)) return echec("introuvable");
    if (this.refusRestants > 0 && !force) {
      this.refusRestants -= 1;
      return echec("refusee-pas-avance-rapide");
    }
    const courant = this.refs.get(ref);
    if (!force && courant !== undefined && !this.estAscendant(courant, sha)) {
      return echec("refusee-pas-avance-rapide");
    }
    this.refs.set(ref, sha);
    if (this.reponsePerdue !== null) {
      const issue = this.reponsePerdue;
      this.reponsePerdue = null;
      return echec(issue);
    }
    return ok(null);
  }

  creerRef(ref: string, sha: string): Promise<ResultatForge<null>> {
    this.appels.push("creerRef");
    if (this.panne !== null) return Promise.resolve(echec(this.panne));
    if (this.refs.has(ref) || !this.commits.has(sha)) return Promise.resolve(echec("introuvable"));
    this.refs.set(ref, sha);
    return Promise.resolve(ok(null));
  }

  // --- interne ----------------------------------------------------------

  private async jouerAvanceConcurrente(): Promise<void> {
    const fichiers = this.avanceAvantEcriture;
    const tete = this.refs.get(REF_PRINCIPALE);
    if (fichiers === null || tete === undefined) return;
    this.avanceAvantEcriture = null;
    const commit = this.commits.get(tete);
    if (commit === undefined) return;
    const arbre = await this.batirArbre(
      commit.arbre,
      Object.entries(fichiers).map(([chemin, contenu]) => ({ chemin, contenu })),
    );
    this.refs.set(REF_PRINCIPALE, await this.enregistrerCommit("commit concurrent", arbre, [tete]));
  }

  /** `ancetre` est atteignable depuis `descendant` en suivant les parents. */
  private estAscendant(ancetre: string, descendant: string): boolean {
    const aVisiter = [descendant];
    const vus = new Set<string>();
    for (let sha = aVisiter.pop(); sha !== undefined; sha = aVisiter.pop()) {
      if (sha === ancetre) return true;
      if (vus.has(sha)) continue;
      vus.add(sha);
      aVisiter.push(...(this.commits.get(sha)?.parents ?? []));
    }
    return false;
  }

  private async batirArbre(base: string | undefined, entrees: readonly EntreeArbre[]): Promise<string> {
    const contenu = new Map<string, string>(base === undefined ? [] : (this.arbres.get(base) ?? []));
    for (const entree of entrees) {
      if ("contenu" in entree) {
        const octets = encodeur.encode(entree.contenu);
        const shaBlob = await shaBlobGit(octets);
        this.blobs.set(shaBlob, octets);
        contenu.set(entree.chemin, shaBlob);
      } else if (entree.sha === null) {
        contenu.delete(entree.chemin);
      } else {
        contenu.set(entree.chemin, entree.sha);
      }
    }
    const lignes = [...contenu.entries()].sort(([a], [b]) => comparerBinaire(a, b));
    const sha = await sha1(encodeur.encode(lignes.map(([chemin, shaBlob]) => `${chemin}\0${shaBlob}`).join("\n")));
    this.arbres.set(sha, contenu);
    return sha;
  }

  private async enregistrerCommit(message: string, arbre: string, parents: readonly string[]): Promise<string> {
    this.compteurCommits += 1;
    const sha = await sha1(
      encodeur.encode(`${arbre}\n${parents.join(",")}\n${message}\n${String(this.compteurCommits)}`),
    );
    this.commits.set(sha, { sha, arbre, parents });
    return sha;
  }
}
