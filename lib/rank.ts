/** Rank = sum of all tag levels (1–10 each). Mirrors the SQLite trigger. */
export function computeRank(levels: number[]): number {
  return levels.reduce((sum, level) => sum + level, 0);
}
