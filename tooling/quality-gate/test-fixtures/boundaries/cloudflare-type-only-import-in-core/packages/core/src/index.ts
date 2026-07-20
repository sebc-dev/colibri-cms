// Fixture : import de `cloudflare:workers` en `import type` uniquement — autorisé (ADR-0004, exception "hors types").
import type { KVNamespace } from "cloudflare:workers";

export function useKv(kv: KVNamespace): KVNamespace {
  return kv;
}
