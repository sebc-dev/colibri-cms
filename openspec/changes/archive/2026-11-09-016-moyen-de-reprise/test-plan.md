## Niveaux

- **Unité** (`tests/unit/auth/`) : `engendrerCodeDeSecours` et `grouperCodeDeSecours` de
  `src/core/auth/code.ts`. Fonctions pures.
- **Intégration dans workerd** (`tests/integration/`) : le cœur du change. Les deux routes sont
  appelées par `exports.default.fetch` avec une vraie D1, sur le patron des tests de connexion
  existants. L'oracle est la base (lignes de `sessions` et de `code_de_secours`), le HTML rendu et les
  en-têtes de réponse.
- **Recette** (`docs/cahier-de-test.md`, serveur `colibri.sebc.dev`) : SC-020 de bout en bout, la boîte
  de recette rendue inaccessible ; la mise en page à 360 px et l'impression.

## Oracle par exigence

- **Ouverture sans message** : une session présente dans `sessions` après la présentation, et le
  double de la liaison d'envoi n'a reçu aucun appel.
- **Usage unique et renouvellement** : l'empreinte de `code_de_secours` a changé ; le code d'origine
  rejoué n'ouvre rien ; le nouveau code relevé dans le HTML ouvre une session ultérieure.
- **Autres sessions fermées** : deux sessions semées avant le geste, une seule ligne après, et
  l'ancienne session relue par `verifierSession` rend `null` (ou l'accueil renvoie vers la connexion).
- **Refus unique** : quatre réponses (faux, servi, remplacé, table vide) dont le corps et la liste des
  en-têtes sont égaux, cookies d'appareil exclus.
- **Seuil** : vingt soumissions mêlées entre `/admin/connexion` et `/admin/reprise` depuis une même
  valeur de `CF-Connecting-IP`, puis la vingt-et-unième refusée ; l'empreinte du code inchangée.
- **Empreinte seule** : après la mise en place, la valeur du code (affichée et normalisée) cherchée
  dans toutes les colonnes texte de toutes les tables de `sqlite_master` : absente.
- **Configuration intacte** : FR-011 se tient par construction (aucun fichier de configuration n'est
  touché par le change) ; la review le constate sur le diff, aucun test n'est utile.

## Cas limites

- Saisie : vide, 25 et 27 signes, minuscules, espaces et tirets, confusables O/I/L/U.
- Table vide (instance livrée sans code), puis une ligne.
- Deux présentations concurrentes du même code (`Promise.all`) : une session, une empreinte nouvelle.
- Création alors qu'aucune session courante n'existe : refusée (renvoi vers la connexion), rien
  n'est écrit.
- Seuil : la 20ᵉ tentative traitée, la 21ᵉ refusée ; panne du compteur simulée par une base qui
  refuse l'écriture de `comptes_seuil`.

## Doubles

- La liaison d'envoi d'e-mail : un double qui compte ses appels, pour constater qu'aucun message ne
  part.
- Aucun double de D1 : la vraie base de Miniflare (ADR-0014).
- Le hasard n'est pas doublé : les tests relèvent le code dans le HTML rendu.

## Uniformité du tirage

Le scénario « Les codes engendrés sont uniformes » se teste sur un échantillon fixe (par exemple
32 000 codes) avec une borne large sur l'écart de fréquence par signe, choisie pour ne pas rougir par
hasard plus d'une fois sur un million. À défaut, la décomposition peut le ranger en mode `observé`
(lecture du tirage : un octet par signe, 256 multiple de 32).

## Zones sans test automatisé

- **SC-020 de bout en bout** et la mise en page (360 px, impression) : recette, ajoutés au cahier de
  test partagé.
- **La perte de réponse après la transaction** (design, Risks) : risque accepté, non testé.
