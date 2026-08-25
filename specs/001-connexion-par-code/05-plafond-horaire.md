# 05 — Le plafond de cinq messages par heure glissante

**Bloqué par :** 04
**Vérif :** test
**Fichiers :** `src/core/auth/regles.ts`, `src/platform/auth/magasin.ts`, `src/pages/admin/connexion.astro`, `src/admin/`, tests

## Ce que ça livre

Au plus cinq messages partent par heure glissante. Ce que le plafond protège d'abord, c'est la boîte
de la cliente : la noyer est un dommage durable, quand une administration momentanément fermée ne
l'est pas.

Il compte les **codes écrits** dans l'heure, jamais les expéditions abouties — la réponse part avant
que l'expédition se résolve, il n'y a donc rien d'abouti à compter au moment où la décision se
prend. Son épreuve est indivisible de l'écriture : le point d'entrée est public et sans seuil par
origine, deux soumissions concurrentes ne doivent pas s'y glisser. Et une ligne devenue morte —
code annulé, brûlé — reste comptée jusqu'à ce qu'elle sorte de l'heure : l'effacer libérerait une
place que le message déjà parti occupe toujours dans la boîte.

Le plafond atteint s'annonce à l'écran, et cette annonce est la même quelle que soit l'adresse
soumise. Elle a le droit de se manifester : la spec ne fait pas de l'adresse autorisée un secret
au-delà d'une soumission.

## Critères

- [ ] le sixième code d'une heure glissante n'est pas écrit, et rien n'est demandé à la plateforme
- [ ] le plafond compte les codes écrits, jamais les expéditions abouties
- [ ] une ligne annulée ou brûlée reste comptée tant qu'elle n'est pas sortie de l'heure
- [ ] une ligne sortie de l'heure cesse d'être comptée, et une soumission redevient possible
- [ ] l'épreuve du plafond et l'écriture du code sont indivisibles : deux soumissions concurrentes n'écrivent pas un sixième code
- [ ] le plafond atteint s'annonce à l'écran, identiquement pour l'adresse autorisée et pour toute autre
- [ ] aucun terme de développeur ne paraît dans l'annonce
