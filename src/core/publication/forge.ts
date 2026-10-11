/**
 * Le port du dépôt distant (ADR-0021) : les seules opérations dont la
 * publication a besoin. Zone `core` (I2) : aucune implémentation ici.
 */

export type IssueForge = 'refusee-pas-avance-rapide' | 'acces-refuse' | 'injoignable' | 'introuvable';

export type ResultatForge<T> =
  | { readonly ok: true; readonly valeur: T }
  | { readonly ok: false; readonly issue: IssueForge };

/** Un texte inliné, ou un blob déjà créé (`sha: null` supprime le chemin). */
export type EntreeArbre =
  | { readonly chemin: string; readonly contenu: string }
  | { readonly chemin: string; readonly sha: string | null };

export interface CommitLu {
  readonly sha: string;
  readonly arbre: string;
  readonly parents: readonly string[];
}

export interface Forge {
  lireRef(ref: string): Promise<ResultatForge<{ readonly sha: string }>>;
  lireCommit(sha: string): Promise<ResultatForge<CommitLu>>;
  creerBlob(base64: string): Promise<ResultatForge<{ readonly sha: string }>>;
  creerArbre(demande: {
    readonly baseArbre?: string;
    readonly entrees: readonly EntreeArbre[];
  }): Promise<ResultatForge<{ readonly sha: string }>>;
  creerCommit(demande: {
    readonly message: string;
    readonly arbre: string;
    readonly parents: readonly string[];
  }): Promise<ResultatForge<{ readonly sha: string }>>;
  deplacerRef(ref: string, sha: string, force: boolean): Promise<ResultatForge<null>>;
  creerRef(ref: string, sha: string): Promise<ResultatForge<null>>;
}
