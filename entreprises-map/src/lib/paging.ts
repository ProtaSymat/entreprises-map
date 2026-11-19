/**
 * Découpe les pages `from + 1 … to` en lots de `size` pages à demander en parallèle.
 * Exemple : planBatches(0, 10, 4) → [[1,2,3,4], [5,6,7,8], [9,10]].
 */
export function planBatches(from: number, to: number, size: number): number[][] {
  const batches: number[][] = [];
  for (let start = from + 1; start <= to; start += size) {
    const batch: number[] = [];
    for (let p = start; p <= Math.min(start + size - 1, to); p++) batch.push(p);
    batches.push(batch);
  }
  return batches;
}
