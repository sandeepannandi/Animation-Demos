// Nativelet Preview Rail. MIT: retain the accompanying LICENSE.
export function indexFromPosition(position: number, extent: number, count: number) {
  if (count <= 0 || extent <= 0 || !Number.isFinite(position)) return -1;
  return Math.max(0, Math.min(count - 1, Math.floor(position / (extent / count))));
}
export function selectedIndex(ids: readonly string[], requestedId?: string) {
  if (!ids.length) return -1;
  const index = ids.indexOf(requestedId ?? '');
  return index < 0 ? 0 : index;
}
export function adjacentIndex(current: number, direction: -1 | 1, count: number) {
  return count ? Math.max(0, Math.min(count - 1, current + direction)) : -1;
}
