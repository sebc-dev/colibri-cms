# 04 — Le refus du code de secours ne dit rien de la cause

**Bloqué par :** 03
**Vérif :** tdd
**Fichiers :** `src/pages/admin/reprise.astro`, `src/platform/auth/code-de-secours.ts`, `src/admin/textes.ts`, `tests/integration/code-de-secours-refus.test.ts`

## Ce que ça livre

Le **code de secours** est le secret noté sur papier qui ouvre l'administration quand la boîte e-mail
de l'adresse autorisée ne répond plus. Il se crée et se remplace depuis l'écran « Code de secours »
(`POST /admin/code-de-secours`, qui écrit l'empreinte du code dans `code_de_secours`, une ligne au
plus) ; il se présente sur l'écran de saisie `/admin/reprise` ; il ne sert qu'une fois et se renouvelle
à l'emploi, en une seule transaction D1 (`ouvrirSessionParCodeDeSecours`).

Ce ticket livre **le refus unique** : un code de secours refusé n'ouvre pas de session et rend **le
même écran** — même texte, même statut, mêmes champs d'en-tête —, qu'il soit faux, déjà servi,
remplacé, ou présenté sur une instance où aucun code n'est en place. Un attaquant qui a trouvé un vieux
papier ne peut pas apprendre s'il a servi. Aucun compte de saisies fautives ne rend le code
inutilisable : ADR-0032 écarte tout frein propre, qui offrirait à un attaquant de priver l'éditrice de
son dernier recours ; seul le seuil par origine (ticket 05) filtre le bruit.

**Par construction.** Les quatre causes suivent le même chemin dans `ouvrirSessionParCodeDeSecours` :
la même transaction, qui ne change rien, et le même `{ reussi: false }`. La route ne branche sur
aucune autre information. Le texte du refus, son statut et ses en-têtes ne dépendent d'aucune branche
du module. Texte : « Ce code n'a pas permis d'entrer. Vérifiez chaque signe, puis réessayez. »,
affiché en message rouge au-dessus du champ, dans `src/admin/textes.ts`, sans terme de développeur
(FR-117).

**L'oracle.** Les réponses se comparent sur le corps et la liste des en-têtes, cookies d'appareil
exclus. Un code « remplacé » s'obtient par deux créations successives depuis l'écran « Code de
secours » (la même écriture sert à la création et au remplacement).

**Hors de ce ticket.** Le seuil de vingt tentatives et ses refus (05) ; la confirmation du
remplacement (06).

## Critères
- [x] un code qui n'est pas le code en place est présenté : aucune session ne s'ouvre, et l'écran invite à vérifier la recopie   (SC-04a)
- [x] sont présentés tour à tour un code faux, un code déjà servi, un code remplacé, et un code quelconque sur une instance sans code en place : les quatre réponses portent le même texte et les mêmes champs d'en-tête   (SC-04b)
- [x] dix codes faux sont présentés, sous le seuil de l'origine, puis le code en place : le code en place ouvre une session   (SC-04c)
- [x] l'écran qui annonce un code de secours refusé ne porte aucun terme de développeur (FR-117)   (SC-04d)
