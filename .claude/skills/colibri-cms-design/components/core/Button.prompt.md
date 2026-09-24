Bouton de l'administration : une seule action `primary` par écran, `danger` réservé aux suppressions définitives.

```jsx
<Button variant="primary" icon="upload-cloud">Publier les modifications</Button>
<Button variant="secondary">Annuler</Button>
<Button variant="danger" size="sm">Supprimer définitivement</Button>
```

- Libellés : verbe d'action à l'infinitif, pas de point d'exclamation.
- Survol : assombrissement léger (aplats) ou fond `surface-sunken` (secondaire/fantôme).
- `loading` pendant une publication ; le libellé reste lisible.
