function PagesList({ setRoute, pending }) {
  const { Card, Button, StatusBadge, Tabs, TextInput, IconButton } = window.ColibriCMSDesignSystem_aa1b5b;
  const [tab, setTab] = React.useState('toutes');
  const [q, setQ] = React.useState('');
  const all = window.CB_DATA.pages.map((p) => ({ ...p, etat: pending ? p.etat : p.etat === 'modifie' ? 'publie' : p.etat }));
  const rows = all.filter((p) => (tab === 'toutes' || (tab === 'attente' && p.etat === 'modifie') || (tab === 'brouillons' && p.etat === 'brouillon')) && p.titre.toLowerCase().includes(q.toLowerCase()));
  return (
    <React.Fragment>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <h1 className="cb-title">Pages</h1>
        <Button icon="plus">Nouvelle page</Button>
      </header>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-6)' }}>
        <Tabs value={tab} onChange={setTab} items={[{ value: 'toutes', label: 'Toutes', count: all.length }, { value: 'attente', label: 'À publier', count: all.filter((p) => p.etat === 'modifie').length }, { value: 'brouillons', label: 'Brouillons', count: all.filter((p) => p.etat === 'brouillon').length }]} style={{ flex: 1 }} />
        <TextInput type="search" value={q} onChange={setQ} placeholder="Rechercher une page" style={{ width: 240 }} />
      </div>
      <Card padding="0">
        {rows.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <button onClick={() => setRoute('edition')} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <span style={{ display: 'block', fontSize: 'var(--body-size)', fontWeight: 600, color: 'var(--ink)' }}>{p.titre}</span>
              <span className="cb-code" style={{ color: 'var(--ink-muted)' }}>{p.url}</span>
            </button>
            <span className="cb-caption" style={{ width: 180 }}>Modifié le {p.maj}</span>
            <StatusBadge state={p.etat} />
            <IconButton icon="pencil" label={'Modifier ' + p.titre} onClick={() => setRoute('edition')} />
          </div>
        ))}
        {rows.length === 0 && <p className="cb-body" style={{ padding: 'var(--space-6)', color: 'var(--ink-muted)' }}>Aucune page ne correspond.</p>}
      </Card>
    </React.Fragment>
  );
}
Object.assign(window, { PagesList });
