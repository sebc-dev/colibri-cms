function App() {
  const [route, setRoute] = React.useState('accueil');
  const [pending, setPending] = React.useState(true);
  const [publishing, setPublishing] = React.useState(false);
  const onPublish = () => {
    setPublishing(true);
    setTimeout(() => { setPublishing(false); setPending(false); }, 2200);
  };
  const onEdit = () => setPending(true);
  return (
    <Shell route={route} setRoute={setRoute} pending={pending} publishing={publishing} onPublish={onPublish}>
      {route === 'accueil' && <Dashboard setRoute={setRoute} pending={pending} />}
      {route === 'pages' && <PagesList setRoute={setRoute} pending={pending} />}
      {route === 'edition' && <PageEditor setRoute={setRoute} onEdit={onEdit} pending={pending} />}
      {route === 'medias' && <Media pending={pending} />}
      {route === 'demandes' && <Requests />}
      {route === 'technique' && <Technique />}
    </Shell>
  );
}
const cbRoot = window.CB_KIT ? document.getElementById('root') : null;
if (cbRoot && !cbRoot.dataset.cbMounted) { cbRoot.dataset.cbMounted = '1'; ReactDOM.createRoot(cbRoot).render(<App />); }
