// Garde contre les violations de la politique de sécurité — valable pour tout
// parcours, quel que soit le geste joué. Deux témoins, car chacun peut manquer
// ce que voit l'autre : l'évènement `securitypolicyviolation` (directive et
// ressource exactes) et le message de console « Refused to … » du navigateur.
import type { BrowserContext, ConsoleMessage } from "@playwright/test";

interface Violation {
  directive: string;
  ressource: string;
}

interface GardePolitique {
  /** Échoue en nommant la directive et la ressource bloquées, s'il y en a. */
  verifier(): void;
}

export async function poserGardePolitique(
  contexte: BrowserContext,
): Promise<GardePolitique> {
  const violations: Violation[] = [];

  await contexte.exposeFunction(
    "__signalerViolation",
    (directive: string, ressource: string) => {
      violations.push({ directive, ressource });
    },
  );
  await contexte.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (evenement) => {
      const signaler = (
        window as Window & {
          __signalerViolation?: (d: string, r: string) => void;
        }
      ).__signalerViolation;
      signaler?.(
        evenement.effectiveDirective,
        evenement.blockedURI || evenement.sample || "(inline)",
      );
    });
  });

  const surConsole = (message: ConsoleMessage): void => {
    const texte = message.text();
    if (!texte.includes("Refused to")) return;
    const directive = /directive:? "([a-z-]+)/.exec(texte)?.[1] ?? "(inconnue)";
    const ressource = message.location().url || texte;
    violations.push({ directive, ressource });
  };
  contexte.on("console", surConsole);

  return {
    verifier(): void {
      if (violations.length === 0) return;
      const detail = violations
        .map((v) => `directive ${v.directive}, ressource ${v.ressource}`)
        .join(" ; ");
      throw new Error(`Violation de la politique de sécurité : ${detail}`);
    },
  };
}
