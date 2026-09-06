<!-- OPTIONNEL. N'écris ce document que si la stratégie de test de CE change mérite d'être posée avant la
     décomposition (transverse, cas limites nombreux, infra de test non triviale). Le mode de vérif de
     chaque ticket est de toute façon tranché par strategie-verif à la décomposition. La politique de test
     DURABLE vit dans docs/test.md — ne la redis pas ici. -->

## Niveaux
<!-- Unité / intégration / contrat / bout-en-bout : lesquels pour ce change, et pourquoi. -->

## Oracle
<!-- Comment « correct » est vérifiable, par scénario. L'oracle vérifiable est le discriminant de
     strategie-verif : s'il n'existe pas avant le code, le ticket ne sera pas en tdd. -->

## Cas limites
<!-- Partitions d'équivalence + valeurs aux bornes qui comptent pour ce change. -->

## Doubles
<!-- Les doubles MINIMAUX nécessaires. Pas de sur-mock couplé à l'implémentation. -->

## Zones sans test automatisé
<!-- Ce qui relèvera du mode `observé` (preuve observable) ou d'un humanCheckRequired, et pourquoi. -->
