function Dashboard({ setRoute, pending }) {
  const { Card, Button, QuotaGauge, StatusBadge, Icon } = window.ColibriCMSDesignSystem_aa1b5b;
  const pages = window.CB_DATA.pages;
  return (
    <React.Fragment>
      <div>
        <h1 className="cb-display">Bonjour, que met-on en ligne ?</h1>
        <p className="cb-caption" style={{ marginTop: 'var(--space-2)' }}>Dernière publication le 18 septembre à 14 h 32 · 48 pages · 312 photos</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        <Card title="Modifié récemment" actions={<Button size="sm" variant="ghost" iconEnd="arrow-right" onClick={() => setRoute('pages')}>Toutes les pages</Button>}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {pages.slice(0, 4).map((p, i) => (
              <button key={p.id} onClick={() => setRoute('edition')} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderTop: i ? '1px solid var(--line)' : 'none', background: 'none', border: 'none', borderTopStyle: i ? 'solid' : 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 'var(--body-size)', fontWeight: 600 }}>{p.titre}</span>
                  <span className="cb-code" style={{ color: 'var(--ink-muted)' }}>{p.url}</span>
                </span>
                <span className="cb-caption">{p.maj}</span>
                <StatusBadge state={pending ? p.etat : p.etat === 'modifie' ? 'publie' : p.etat} />
              </button>
            ))}
          </div>
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <Card title="Le plan gratuit" meta="Tout tient sur votre compte">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
              <QuotaGauge label="Photos" value={312} max={2000} remainingText="Il reste de la place pour environ 1 688 photos." />
              <QuotaGauge label="Publications ce mois-ci" value={431} max={500} remainingText="Il reste 69 publications ce mois-ci." />
            </div>
          </Card>
          <Card title="Demandes de devis" actions={<Button size="sm" variant="ghost" iconEnd="arrow-right" onClick={() => setRoute('demandes')}>Voir</Button>}>
            <p className="cb-body" style={{ marginTop: 'var(--space-1)' }}>2 nouvelles demandes depuis votre dernière visite.</p>
          </Card>
        </div>
      </div>
    </React.Fragment>
  );
}
Object.assign(window, { Dashboard });
