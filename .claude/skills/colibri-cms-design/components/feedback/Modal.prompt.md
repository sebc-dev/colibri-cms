Confirmation d'une action irréversible.

```jsx
<Modal tone="danger" title="Supprimer définitivement cette photo ?" description="Elle disparaîtra aussi du site."
  actions={<><Button variant="secondary">Annuler</Button><Button variant="danger">Supprimer</Button></>} />
```

Le titre pose la question entière, la description dit la conséquence. Le parent doit être `position: relative`.
