# 01 — Reconnaître et mesurer une image à téléverser

**Bloqué par :** —
**Vérif :** tdd
**Fichiers :** `src/core/medias/ingestion.ts` (nouveau — reconnaissance sur les octets, borne de poids, lecture des dimensions, type déduit), `tests/unit/` (fichiers d'images réels : JPEG, PNG, WebP valides ; un SVG ; un format hors liste ; un fichier dont l'extension ou le type déclaré ment sur ses octets ; un fichier tronqué)

## Ce que ça livre
Le cœur du produit sait, à partir des seuls octets d'un fichier proposé, dire s'il s'agit d'une image admise et laquelle : JPEG, PNG et WebP sont reconnus sur leurs octets d'en-tête et admis ; tout autre format — SVG compris — est refusé au titre du format ; un fichier de plus de 2 Mo est refusé au titre du poids. D'un fichier admis, il lit les dimensions à l'en-tête et retient un type déduit de la liste des trois formats — jamais l'extension du nom ni le type déclaré au téléversement. C'est la brique pure sur laquelle la réserve s'appuiera pour n'accepter et ne resservir que des images sûres. (La borne exacte à 2 Mo — inclusive ou exclusive — est tranchée et testée à l'implémentation.)

## Critères
- [ ] Un JPEG, un PNG ou un WebP est reconnu sur ses octets d'en-tête, admis, avec son type déduit de la liste des trois formats et ses dimensions lues à l'en-tête.   (SC-01a)
- [ ] Un fichier dont les octets d'en-tête sont ceux d'un SVG — ou de tout format hors des trois admis — est refusé au titre du format.   (SC-01b)
- [ ] Un fichier qui porte une extension ou un type déclaré d'image admise mais dont les octets d'en-tête sont hors liste est refusé : seuls les octets décident.   (SC-01c)
- [ ] Un fichier de plus de 2 Mo est refusé au titre du poids.   (SC-01d)
