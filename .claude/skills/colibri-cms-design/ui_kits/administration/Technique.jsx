function Technique() {
  const { Card, Button, LogView, CloudflareNote, QuotaGauge, StatusBadge, TextInput, Field } = window.ColibriCMSDesignSystem_aa1b5b;
  return (
    <React.Fragment>
      <header>
        <h1 className="cb-title">Technique</h1>
        <div style={{ marginTop: 'var(--space-2)' }}><CloudflareNote /></div>
        <p className="cb-caption" style={{ marginTop: 'var(--space-2)' }}>Écran réservé au studio. Le vocabulaire de cette page ne sort pas d'ici.</p>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        <Card title="Journal de publication" actions={<Button size="sm" variant="secondary" icon="rotate-cw">Relancer un build</Button>}>
          <div style={{ marginTop: 'var(--space-2)' }}><LogView maxHeight={200} lines={window.CB_DATA.journal} /></div>
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <Card title="Dernier build">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <StatusBadge state="publie">Build 218 · réussi</StatusBadge>
              <p className="cb-code" style={{ color: 'var(--ink-muted)' }}>colibri-site.pages.dev</p>
              <p className="cb-caption">43 s · 48 pages · 312 images</p>
            </div>
          </Card>
          <Card title="Plan gratuit Cloudflare">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
              <QuotaGauge label="Builds Pages / mois" value={431} max={500} />
              <QuotaGauge label="Stockage R2" value={1900} max={10000} unit="Mo" />
              <QuotaGauge label="Lignes D1" value={2840} max={5000000} />
            </div>
          </Card>
          <Card title="Connexion" inset>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <Field label="Identifiant du compte" htmlFor="acc"><TextInput id="acc" mono readOnly value="a1b2c3d4e5f6" onChange={() => {}} /></Field>
              <Field label="Projet Pages" htmlFor="prj"><TextInput id="prj" mono readOnly value="colibri-site" onChange={() => {}} /></Field>
            </div>
          </Card>
        </div>
      </div>
    </React.Fragment>
  );
}
Object.assign(window, { Technique });
