// Neutralise le SEUL rejet non géré bénin d'es-module-lexer, en remplacement du
// drapeau global --dangerouslyIgnoreUnhandledErrors (qui masquait TOUS les rejets).
//
// Astro embarque es-module-lexer — un outil de BUILD (parsing d'imports) — dans le
// bundle SSR du Worker. Son initialisation lance un `WebAssembly.compile(...)`
// fire-and-forget, sans `.catch`, dont le résultat est jeté. Le sandbox workerd
// (@cloudflare/vitest-plugin, ADR-0014) interdit la génération de code WASM à
// l'exécution → la promesse rejette → un rejet non géré par test qui démarre le
// Worker. Le lexer ne sert qu'au build : aucun test n'en dépend, le vert est réel.
//
// On intercepte `WebAssembly.compile` : quand il échoue AVEC ce refus précis, on
// renvoie une promesse pendante — la chaîne `.then(...)` du lexer ne rejette donc
// plus, et l'erreur d'origine est ici HANDLED. Tout AUTRE échec WASM est ré-émis
// tel quel, et tout autre rejet non géré redevient un échec visible.
const compilerOriginal = WebAssembly.compile.bind(WebAssembly);

WebAssembly.compile = ((...args: Parameters<typeof WebAssembly.compile>) => {
  return compilerOriginal(...args).catch((err: unknown) => {
    if (
      err instanceof Error &&
      err.name === 'CompileError' &&
      err.message.includes('Wasm code generation disallowed by embedder')
    ) {
      return new Promise<WebAssembly.Module>(() => {
        // Volontairement pendante, et jamais résolue : c'est ce qui rend la
        // chaîne `.then(...)` du lexer inerte au lieu de la faire rejeter.
      });
    }
    throw err;
  });
});
