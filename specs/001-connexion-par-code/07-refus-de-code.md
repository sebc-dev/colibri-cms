# 07 — Chaque refus de code dit quel geste reprendre

**Bloqué par :** 06
**Vérif :** test
**Fichiers :** `src/core/auth/verdict.ts`, `src/core/auth/regles.ts`, `src/platform/auth/magasin.ts`, `src/admin/textes.ts`, `src/admin/`, tests

## Ce que ça livre

Un code refusé ne laisse jamais l'éditrice devant un mur : l'écran lui dit lequel des trois gestes
reprendre — retaper, demander un nouveau code, revenir sur l'appareil demandeur. Cinq causes, trois
gestes, et chaque cause appelle celui qui la débloque réellement.

Deux règles naissent ici parce que ce sont elles qui produisent les refus restants. **Le brûlage** :
à la cinquième saisie fautive, le code cesse d'être présentable — c'est ce qui oppose une résistance
à qui essaierait les codes un par un, l'entropie seule n'y suffisant pas. **L'annulation** : une
nouvelle demande depuis le même appareil rend inutilisable le code précédent **de cet appareil** —
un code demandé depuis un autre appareil n'est pas touché et continue d'y ouvrir une session, sans
quoi le multi-appareil se casserait. L'écran de saisie l'annonce, borné à l'appareil : « seul le
dernier message reçu » serait faux pour qui a deux appareils en cours.

Le piège à ne pas ouvrir : ne pas filtrer les codes à la lecture. C'est le verdict qui tranche à
partir de l'état lu — filtrer en amont renverrait l'éditrice sur un autre appareil pour un code
qu'elle a bien demandé sur le sien.

## Critères

- [x] une saisie fautive invite à retaper, et aucune session ne s'ouvre
- [x] la cinquième saisie fautive rend le code inutilisable pour toute présentation ultérieure, et invite à demander un nouveau code
- [x] un code présenté depuis un appareil qui n'en a jamais demandé invite à revenir sur l'appareil demandeur — jamais à en demander un nouveau
- [x] une nouvelle demande depuis le même appareil rend inutilisable le code précédent de cet appareil ; un code demandé depuis un autre appareil reste utilisable
- [x] un code expiré, déjà utilisé ou annulé invite à demander un nouveau code — jamais à revenir sur un autre appareil
- [x] l'écran de saisie annonce que seul le dernier code demandé depuis cet appareil permet d'entrer
- [x] aucun terme de développeur ne paraît dans les textes de refus
