/**
 * Configuration de déploiement effective (ADR-0034) : fonction pure qui, depuis
 * la configuration produite par la construction et les valeurs d'instance,
 * donne la configuration que le déploiement lit. Elle sert le domaine de
 * l'instance, ferme l'adresse par défaut de la plateforme et les aperçus,
 * désigne la base par son nom (jamais par un identifiant), et n'ajoute ni ne
 * retire aucune liaison. Idempotente.
 */
import type { ValeursDInstance } from './fichier-d-instance.ts';

type Configuration = Record<string, unknown>;

export function deriverConfigurationDeDeploiement(
  produite: Configuration,
  valeurs: Pick<ValeursDInstance, 'domain'>,
): Configuration {
  const bases = produite.d1_databases;
  const aLiaisonDB =
    Array.isArray(bases) &&
    bases.some((base) => (base as Configuration | null)?.binding === 'DB');
  if (!aLiaisonDB) {
    throw new Error(
      "La configuration produite par la construction n'a aucune liaison DB : rien à déployer.",
    );
  }

  return {
    ...produite,
    d1_databases: (bases as Configuration[]).map((base) => {
      const sansIdentifiant = { ...base };
      delete sansIdentifiant.database_id;
      return sansIdentifiant;
    }),
    routes: [{ pattern: valeurs.domain, custom_domain: true }],
    workers_dev: false,
    preview_urls: false,
  };
}
