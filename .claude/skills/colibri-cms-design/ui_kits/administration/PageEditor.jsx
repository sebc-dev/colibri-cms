function Photo({ nom, poids, onDelete }) {
  const { Card, Button, Field, TextInput, Textarea, Checkbox, Tabs, StatusBadge, Modal, IconButton, DropZone } = window.ColibriCMSDesignSystem_aa1b5b;
  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <div style={{ position: 'relative', aspectRatio: '4 / 3', background: 'var(--surface-sunken)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', display: 'grid', placeItems: 'center' }}>
        <span className="cb-caption" style={{ textAlign: 'center', padding: '0 8px' }}>photo de la cliente</span>
        <span style={{ position: 'absolute', top: 4, right: 4 }}><IconButton size="sm" icon="trash-2" variant="danger" label={'Supprimer ' + nom} onClick={onDelete} /></span>
      </div>
      <figcaption className="cb-caption" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nom} · {poids}</figcaption>
    </figure>
  );
}

function PageEditor({ setRoute, onEdit, pending }) {
  const { Card, Button, Field, TextInput, Textarea, Checkbox, Tabs, StatusBadge, Modal, IconButton, DropZone } = window.ColibriCMSDesignSystem_aa1b5b;
  const [tab, setTab] = React.useState('contenu');
  const [titre, setTitre] = React.useState('Galerie — Pièces montées');
  const [desc, setDesc] = React.useState('Chaque pièce est montée le matin même, avec des choux garnis à la commande.');
  const [confirm, setConfirm] = React.useState(null);
  const photos = window.CB_DATA.photos.slice(0, 6);
  return (
    <div style={{ position: 'relative' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div>
          <button onClick={() => setRoute('pages')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--link)', fontSize: 'var(--caption-size)', textDecoration: 'underline' }}>Pages</button>
          <h1 className="cb-title" style={{ marginTop: 'var(--space-1)' }}>{titre}</h1>
          <p className="cb-code" style={{ color: 'var(--ink-muted)', marginTop: 4 }}>monsite.fr/galerie/pieces-montees</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <StatusBadge state={pending ? 'modifie' : 'publie'} />
          <Button variant="secondary" icon="eye">Voir la page</Button>
          <Button icon="check" onClick={onEdit}>Enregistrer</Button>
        </div>
      </header>
      <Tabs value={tab} onChange={setTab} items={[{ value: 'contenu', label: 'Contenu' }, { value: 'photos', label: 'Photos', count: photos.length }, { value: 'reglages', label: 'Réglages' }]} style={{ marginBottom: 'var(--space-6)' }} />
      {tab === 'contenu' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-6)', alignItems: 'start' }}>
          <Card padding="var(--panel-padding)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <Field label="Titre de la page" htmlFor="t"><TextInput id="t" value={titre} onChange={(v) => { setTitre(v); onEdit(); }} /></Field>
              <Field label="Adresse de la page" htmlFor="u" help="Changer l'adresse casse les liens déjà partagés.">
                <TextInput id="u" mono prefix="monsite.fr" value="/galerie/pieces-montees" onChange={() => {}} />
              </Field>
              <Field label="Texte d'introduction" htmlFor="d"><Textarea id="d" rows={5} value={desc} onChange={(v) => { setDesc(v); onEdit(); }} /></Field>
            </div>
          </Card>
          <Card title="Mise en ligne" meta="Modifié le 18 septembre à 14 h 05">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <Checkbox id="menu" checked onChange={() => {}} label="Afficher dans le menu" />
              <Checkbox id="seo" checked={false} onChange={() => {}} label="Masquer aux moteurs de recherche" help="La page reste accessible par son adresse." />
              <Button variant="ghost" icon="trash-2" style={{ color: 'var(--danger)', justifyContent: 'flex-start', padding: 0 }} onClick={() => setConfirm('page')}>Supprimer cette page</Button>
            </div>
          </Card>
        </div>
      )}
      {tab === 'photos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <DropZone help="JPEG ou PNG, 10 Mo au maximum par photo." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
            {photos.map((p) => <Photo key={p.id} {...p} onDelete={() => setConfirm(p.nom)} />)}
          </div>
        </div>
      )}
      {tab === 'reglages' && (
        <Card padding="var(--panel-padding)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 520 }}>
            <Field label="Titre affiché dans l'onglet du navigateur" htmlFor="s1"><TextInput id="s1" value="Pièces montées — Pâtisserie Mirabelle" onChange={() => {}} /></Field>
            <Field label="Description pour les moteurs de recherche" htmlFor="s2" optional help="Deux phrases au maximum."><Textarea id="s2" rows={3} value="Pièces montées sur mesure, montées le matin même." onChange={() => {}} /></Field>
          </div>
        </Card>
      )}
      <Modal open={!!confirm} tone="danger" onClose={() => setConfirm(null)}
        title={confirm === 'page' ? 'Supprimer définitivement cette page ?' : 'Supprimer définitivement cette photo ?'}
        description={confirm === 'page' ? 'Elle disparaîtra aussi du site, avec ses photos.' : 'Elle disparaîtra aussi du site.'}
        actions={<React.Fragment><Button variant="secondary" onClick={() => setConfirm(null)}>Annuler</Button><Button variant="danger" onClick={() => setConfirm(null)}>Supprimer</Button></React.Fragment>} />
    </div>
  );
}
Object.assign(window, { PageEditor, Photo });
