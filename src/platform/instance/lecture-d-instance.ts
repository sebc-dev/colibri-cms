/**
 * Seul lecteur d'instance.json (I19, ADR-0034) ; délègue la validation à la
 * fonction pure de fichier-d-instance.ts.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lireLeFichierDInstance, type ValeursDInstance } from './fichier-d-instance.ts';

export function lireInstanceDuDepot(racine: URL): ValeursDInstance {
  const chemin = fileURLToPath(new URL('./instance.json', racine));
  return lireLeFichierDInstance(readFileSync(chemin, 'utf-8'));
}
