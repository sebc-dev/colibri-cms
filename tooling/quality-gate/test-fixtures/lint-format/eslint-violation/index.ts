// Fixture "eslint-violation" — variable déclarée puis jamais utilisée (no-unused-vars).
export function addition(a: number, b: number): number {
  const inutilisee = 42;
  return a + b;
}
