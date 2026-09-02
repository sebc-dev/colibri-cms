/**
 * Utilitaires copiés par la CLI shadcn-svelte (ticket 02,
 * specs/002-socle-ilots-admin/02-composant-shadcn-sous-csp.md, ADR-0009) —
 * source amont : registre shadcn-svelte, item `utils`. `cn` fusionne les
 * classes Tailwind conditionnelles des primitives (`clsx` + `tailwind-merge`,
 * qui résout les classes concurrentes, p. ex. deux `px-*`).
 *
 * `verifier-guard` (CI, CLAUDE.md) refuse tout typage évincé (mot-clé "any"
 * non qualifié, désactivation eslint en ligne) sans commit signé : la
 * version amont neutralisait la règle qui interdit ce mot-clé sur
 * `WithoutChild`/`WithoutChildren` (deux types non utilisés par le seul
 * composant copié ici, `button.svelte`) — `unknown` prend la place dans la
 * contrainte conditionnelle, sans changer le comportement pour tout type
 * `T` réellement pourvu d'un `child`/`children`.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, 'child'> : T;
export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
