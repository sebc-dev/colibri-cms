# 03 — Le noyau vérifie chaque coordonnée selon sa nature

**Bloqué par :** 02
**Vérif :** tdd
**Fichiers :** `src/core/reglages/coordonnees.ts`, `tests/unit/reglages/coordonnees.test.ts`

## Ce que ça livre

Avant qu'une correction des coordonnées puisse être enregistrée (ticket 05), le noyau sait dire si une
valeur convient à la nature **déclarée** de sa coordonnée, et sait reconstituer les coordonnées
courantes à partir de la déclaration et d'un brouillon. Le but est d'arrêter la faute de frappe, pas de
prouver qu'un numéro existe : les bornes sont explicites et testées à leurs limites.

**Règles (spec `reglages-transverses`, exigence « Correction des coordonnées ») — sur la valeur, espaces
de début et de fin retirés :**
- **texte d'une ligne** : au plus 120 caractères, sans saut de ligne ;
- **téléphone** : uniquement des chiffres, espaces, points, tirets et parenthèses, avec au plus un « + »
  **en tête**, et de 6 à 15 chiffres ;
- **adresse e-mail** : sans espace, un seul « @ », une partie non vide avant lui, un nom de domaine
  portant au moins un point après lui, au plus 254 caractères ;
- **adresse postale** : au plus 5 lignes et 300 caractères ;
- une valeur **vide** est admise pour toute nature.

**Décisions à respecter :**
- Logique pure dans `src/core/reglages/` (`I2`), sans framework ni plateforme. Les bornes (120, 6–15,
  254, 5 lignes / 300) sont des **constantes nommées** du module.
- Un refus porte un **code de raison** par nature (pas un texte français : la traduction vit dans
  l'îlot, ticket 06).
- Rattachement d'un brouillon : la valeur au brouillon se rattache à sa coordonnée par **identifiant
  stable** ; une valeur dont la coordonnée n'est plus déclarée est **ignorée** (jamais une erreur), et
  une coordonnée déclarée sans valeur au brouillon garde sa **valeur de départ**. L'ordre et la nature
  sont toujours ceux de la déclaration (ticket 02).

**Hors périmètre :** l'application d'une soumission entière (refus si une seule valeur est refusée, ou
si un identifiant n'est pas déclaré) et son enregistrement — ticket 05 ; les messages pour l'éditrice —
ticket 06.

## Critères
- [ ] En `core/`, « 01 23 45 67 89 », « +33 (0)1.23.45.67.89 » et « 123456 » sont acceptés comme téléphone ; « 12345 » (5 chiffres), seize chiffres, « 01 23 AB » et « 01 + 23 45 67 » sont refusés   (SC-03a)
- [ ] En `core/`, « atelier@exemple.fr » est acceptée comme adresse e-mail ; « atelier@exemple », « @exemple.fr », « atelier exemple@exemple.fr », « a@b@exemple.fr » et une adresse de 255 caractères sont refusées   (SC-03b)
- [ ] En `core/`, un texte d'une ligne de 120 caractères est accepté, un de 121 caractères ou portant un saut de ligne est refusé ; une adresse postale de 5 lignes est acceptée, une de 6 lignes ou de plus de 300 caractères est refusée   (SC-03c)
- [ ] En `core/`, quand le brouillon porte une valeur pour une coordonnée qui n'est plus déclarée et qu'une coordonnée déclarée n'a pas de valeur au brouillon, la valeur orpheline est ignorée et la coordonnée sans valeur au brouillon garde sa valeur de départ   (SC-03d)
