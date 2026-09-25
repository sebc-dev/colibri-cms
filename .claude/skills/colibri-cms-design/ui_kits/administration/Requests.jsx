function Requests() {
  const { Card, Button, StatusBadge, Select, Tabs, Modal, IconButton, Switch } = window.ColibriCMSDesignSystem_aa1b5b;
  const [sel, setSel] = React.useState(window.CB_DATA.demandes[1]);
  const [confirm, setConfirm] = React.useState(false);
  const [actif, setActif] = React.useState(true);
  const [tab, setTab] = React.useState('toutes');
  const rows = window.CB_DATA.demandes;
  return (
    <div style={{ position: 'relative' }}>
      <header style={{ marginBottom: 'var(--space-4)' }}>
        <h1 className="cb-title">Demandes de devis</h1>
        <p className="cb-caption" style={{ marginTop: 4 }}>4 demandes · 2 non lues</p>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-6)', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Tabs value={tab} onChange={setTab} items={[{ value: 'toutes', label: 'Toutes', count: 4 }, { value: 'devis', label: 'Devis envoyé', count: 1 }, { value: 'commande', label: 'Commandes', count: 1 }]} />
          <Card padding="0">
            {rows.map((d, i) => (
              <button key={d.id} onClick={() => setSel(d)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', width: '100%', textAlign: 'left', padding: 'var(--space-3) var(--space-4)', borderTop: i ? '1px solid var(--line)' : 'none', background: sel && sel.id === d.id ? 'var(--surface-sunken)' : 'transparent', border: 'none', borderTopStyle: i ? 'solid' : 'none', cursor: 'pointer' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 'var(--body-size)', fontWeight: 600, color: 'var(--ink)' }}>{d.nom}</span>
                  <span className="cb-caption" style={{ display: 'block' }}>{d.objet}</span>
                </span>
                <span className="cb-caption" style={{ width: 160 }}>{d.date}</span>
                <StatusBadge state={d.etat} />
              </button>
            ))}
          </Card>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {sel && (
            <Card title={sel.nom} meta={'Reçue le ' + sel.date}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <p className="cb-body">{sel.objet}</p>
                <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-1) var(--space-3)', fontSize: 'var(--caption-size)' }}>
                  <dt style={{ color: 'var(--ink-muted)' }}>Courriel</dt><dd style={{ margin: 0 }}>{sel.email}</dd>
                  <dt style={{ color: 'var(--ink-muted)' }}>Téléphone</dt><dd style={{ margin: 0 }}>{sel.tel}</dd>
                </dl>
                <Select value={sel.etat} onChange={(v) => setSel({ ...sel, etat: v })} options={[{ value: 'sans-suite', label: 'Sans suite' }, { value: 'devis-envoye', label: 'Devis envoyé' }, { value: 'commande', label: 'Commande' }]} />
                <Button variant="ghost" icon="trash-2" style={{ color: 'var(--danger)', justifyContent: 'flex-start', padding: 0 }} onClick={() => setConfirm(true)}>Supprimer cette demande</Button>
              </div>
            </Card>
          )}
          <Card title="Le formulaire">
            <Switch checked={actif} onChange={setActif} label="Formulaire de devis actif" help="Désactivé, le formulaire disparaît du site à la prochaine publication." style={{ marginTop: 'var(--space-2)' }} />
          </Card>
        </div>
      </div>
      <Modal open={confirm} tone="danger" onClose={() => setConfirm(false)}
        title="Supprimer définitivement cette demande ?" description="Les coordonnées de la personne seront effacées."
        actions={<React.Fragment><Button variant="secondary" onClick={() => setConfirm(false)}>Annuler</Button><Button variant="danger" onClick={() => setConfirm(false)}>Supprimer</Button></React.Fragment>} />
    </div>
  );
}
Object.assign(window, { Requests });
