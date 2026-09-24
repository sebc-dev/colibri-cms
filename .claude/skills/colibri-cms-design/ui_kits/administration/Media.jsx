function Media({ pending }) {
  const { Card, Button, DropZone, QuotaGauge, StatusBadge, IconButton, Modal, Tabs } = window.ColibriCMSDesignSystem_aa1b5b;
  const [confirm, setConfirm] = React.useState(null);
  const [tab, setTab] = React.useState('toutes');
  const photos = window.CB_DATA.photos;
  return (
    <div style={{ position: 'relative' }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div><h1 className="cb-title">Médiathèque</h1><p className="cb-caption" style={{ marginTop: 4 }}>312 photos · 1,9 Go</p></div>
        <Button icon="image-plus">Ajouter des photos</Button>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--space-6)', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Tabs value={tab} onChange={setTab} items={[{ value: 'toutes', label: 'Toutes', count: photos.length }, { value: 'recentes', label: 'Ajoutées récemment' }]} />
          <DropZone help="JPEG ou PNG, 10 Mo au maximum par photo." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
            {photos.map((p) => (
              <figure key={p.id} style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <div style={{ position: 'relative', aspectRatio: '4 / 3', background: 'var(--surface-sunken)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', display: 'grid', placeItems: 'center' }}>
                  <span className="cb-caption" style={{ textAlign: 'center', padding: '0 8px' }}>photo de la cliente</span>
                  <span style={{ position: 'absolute', top: 4, right: 4 }}><IconButton size="sm" icon="trash-2" variant="danger" label={'Supprimer ' + p.nom} onClick={() => setConfirm(p.nom)} /></span>
                </div>
                <figcaption style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                  <span className="cb-caption" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nom}</span>
                  {pending && p.etat === 'modifie' && <StatusBadge state="modifie">Non publié</StatusBadge>}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
        <Card title="Le plan gratuit">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
            <QuotaGauge label="Photos" value={312} max={2000} remainingText="Il reste de la place pour environ 1 688 photos." />
            <QuotaGauge label="Poids total" value={1900} max={2400} unit="Mo" remainingText="Au-delà, les nouvelles photos seront refusées." />
          </div>
        </Card>
      </div>
      <Modal open={!!confirm} tone="danger" onClose={() => setConfirm(null)}
        title="Supprimer définitivement cette photo ?" description="Elle disparaîtra aussi du site."
        actions={<React.Fragment><Button variant="secondary" onClick={() => setConfirm(null)}>Annuler</Button><Button variant="danger" onClick={() => setConfirm(null)}>Supprimer</Button></React.Fragment>} />
    </div>
  );
}
Object.assign(window, { Media });
