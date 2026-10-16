# 08 — Une saisie incomplète ou mal formée est désignée, et rien ne part

**Bloqué par :** 07
**Vérif :** tdd
**Fichiers :** `src/core/formulaires/saisie.ts`, `src/core/formulaires/demande.ts`, `src/pages/api/public/demandes.ts`, `src/render/formulaire/module.ts`, `src/render/formulaire/textes.ts`, `tests/unit/formulaires/saisie.test.ts`, `tests/integration/saisie-refusee.test.ts`, `tests/parcours/formulaire-saisie.parcours.ts`

## Ce que ça livre

L'envoi est refusé tant qu'un champ obligatoire n'est pas renseigné (FR-058). Un champ obligatoire est
vide dans trois cas :
- un champ de texte, de texte long, d'e-mail ou de téléphone vide, ou fait d'espaces ;
- un champ à choix unique sans option choisie ;
- un champ à choix multiple sans option cochée.

Les saisies ont aussi une forme et une longueur :
- une adresse e-mail doit avoir la forme d'une adresse ;
- un numéro de téléphone ne porte que des chiffres, des espaces, des points, des tirets, des parenthèses
  et un `+` initial ;
- chaque saisie tient dans sa longueur maximale : 200 caractères pour un texte, 2 000 pour un texte long,
  254 pour une adresse e-mail, 30 pour un numéro de téléphone.

Quand quelque chose manque ou ne va pas, **rien n'est envoyé** :
- chaque champ en cause porte son message sous lui, en disant ce qui manque ou ne va pas ;
- un résumé paraît en tête du formulaire, « Votre demande n'est pas partie : vérifiez les champs
  ci-dessous. », suivi des libellés en cause ;
- chaque libellé du résumé est un lien vers son champ, et le focus va au résumé ;
- rien n'est effacé.

Le **serveur applique les mêmes règles** à toute demande reçue, même sans passer par le formulaire de la
page, et n'envoie alors aucun e-mail.

**Décisions à respecter :**
- **Une seule fonction pure de `core/`** (`src/core/formulaires/saisie.ts`) porte ces règles. Le module
  du navigateur et la route d'envoi l'appellent tous les deux, pour que les deux côtés ne puissent pas
  diverger.
- **Le refus du serveur.** Il rend `400 { "statut": "champs", "champs": [{ "champ", "motif" }] }`. Il ne
  porte que des identifiants de champ et des codes de motif, jamais une valeur saisie. Quand le serveur
  refuse ainsi, le module montre les mêmes messages que s'il avait bloqué lui-même.
- **La forme d'une adresse e-mail :**
  - `nom@domaine.fr` est accepté ;
  - `marie.exemple.fr`, `nom@` et `@domaine.fr` sont refusés.
- **La forme d'un numéro :**
  - `+33 6 12 34 56 78`, `06.12.34.56.78` et `(0)6-12-34-56-78` sont acceptés ;
  - un numéro avec des lettres, ou un `+` ailleurs qu'en tête, est refusé.
- **Les longueurs** se comptent en caractères : un émoji compte pour un. Les cas aux bornes sont
  200/201, 2 000/2 001, 254/255 et 30/31.
- **Les textes** vivent dans `src/render/formulaire/textes.ts`, sans terme technique :
  - champ à renseigner : « Ce champ est à renseigner. » ;
  - adresse mal formée : « Cette adresse e-mail semble incomplète (exemple : nom@domaine.fr). » ;
  - numéro mal formé : « Ce numéro ne semble pas valide (exemple : 06 12 34 56 78). » ;
  - saisie trop longue : « Ce texte dépasse {n} caractères. » ;
  - résumé : « Votre demande n'est pas partie : vérifiez les champs ci-dessous. ».

  Aucun texte vu par le visiteur ne montre un code ou un terme de la réponse du serveur.
- **L'écriture.** Le module n'écrit qu'en texte (`textContent`).

**Hors périmètre :** la demande qui ne s'accorde pas au formulaire publié — champ, option ou page
inconnus, total faux (ticket 09) ; les refus d'origine, de format et de taille (ticket 10).

## Critères
- [ ] Quand le visiteur envoie le formulaire « Devis gâteau » sans avoir renseigné « Votre adresse e-mail », rien n'est envoyé, et le formulaire désigne « Votre adresse e-mail » comme champ à renseigner   (SC-08a)
- [ ] Quand le visiteur envoie le formulaire sans avoir choisi de parfum, rien n'est envoyé, et le formulaire désigne « Parfum » comme champ à renseigner   (SC-08b)
- [ ] Quand le visiteur n'a saisi que des espaces dans « Votre adresse e-mail » et envoie, rien n'est envoyé, et le formulaire désigne ce champ comme champ à renseigner   (SC-08c)
- [ ] Quand le visiteur saisit « marie.exemple.fr » dans « Votre adresse e-mail » et envoie, rien n'est envoyé, et le formulaire désigne ce champ en disant que l'adresse n'a pas la forme d'une adresse e-mail   (SC-08d)
- [ ] Quand le visiteur saisit 2 001 caractères dans « Votre message » et envoie, rien n'est envoyé, et le formulaire désigne ce champ en disant sa longueur maximale   (SC-08e)
- [x] Quand une demande parvient au serveur sans valeur pour un champ obligatoire, sans passer par le formulaire de la page, elle est refusée en désignant ce champ, et aucun e-mail n'est envoyé   (SC-08f)
