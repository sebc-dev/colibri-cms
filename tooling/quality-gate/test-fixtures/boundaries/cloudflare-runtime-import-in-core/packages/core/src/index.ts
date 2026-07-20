// Fixture : import runtime (non-type) de `cloudflare:workers` dans @colibri/core — interdit (ADR-0004).
import { env } from "cloudflare:workers";

export function getEnv(): unknown {
  return env;
}
