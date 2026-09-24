function Shell({ route, setRoute, pending, publishing, onPublish, children }) {
  const { Logo, CloudflareNote, NavItem, Banner, Button, StatusBadge } = window.ColibriCMSDesignSystem_aa1b5b;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '248px 1fr', minHeight: 720, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-sans)' }}>
      <aside style={{ borderRight: '1px solid var(--line)', background: 'var(--surface-raised)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <Logo height={28} assetBase="../../" />
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          <NavItem icon="layout-dashboard" label="Tableau de bord" active={route === 'accueil'} onClick={() => setRoute('accueil')} />
          <NavItem icon="file-text" label="Pages" active={route === 'pages' || route === 'edition'} onClick={() => setRoute('pages')} badge={pending ? 2 : undefined} />
          <NavItem icon="images" label="Médiathèque" active={route === 'medias'} onClick={() => setRoute('medias')} badge={pending ? 2 : undefined} />
          <NavItem icon="inbox" label="Demandes" active={route === 'demandes'} onClick={() => setRoute('demandes')} badge={2} />
          <NavItem icon="terminal" label="Technique" active={route === 'technique'} onClick={() => setRoute('technique')} />
        </nav>
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <p style={{ margin: 0, fontSize: 'var(--caption-size)', lineHeight: 'var(--caption-line)', color: 'var(--ink-muted)' }}>Pâtisserie Mirabelle</p>
          <CloudflareNote />
        </div>
      </aside>
      <main style={{ padding: 'var(--space-8) var(--page-margin)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minWidth: 0 }}>
        {publishing ? (
          <Banner tone="info" title="Publication en cours">Vos modifications seront en ligne dans une minute environ.</Banner>
        ) : pending ? (
          <Banner tone="gorge" title="4 modifications à publier" actions={<Button icon="upload-cloud" onClick={onPublish}>Publier les modifications</Button>}>
            Vos visiteurs voient encore la version précédente.
          </Banner>
        ) : (
          <Banner tone="plumage" title="Tout est en ligne" icon="check">Dernière publication le 18 septembre à 14 h 32.</Banner>
        )}
        {children}
      </main>
    </div>
  );
}
Object.assign(window, { Shell });
