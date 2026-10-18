export type ToastVariant = 'default' | 'success' | 'error' | 'info';
export interface ToastAction { label: string; onPress: () => void }
export interface ToastOptions { id?: string; message: string; description?: string; variant?: ToastVariant; duration?: number; action?: ToastAction }
export interface ToastRecord extends ToastOptions { id: string; variant: ToastVariant; duration: number; revision: number }
export const DEFAULT_DURATION = 5000;
export function normalizeDuration(value?: number) {
  return value === Infinity ? Infinity : Number.isFinite(value) ? Math.max(0, value!) : DEFAULT_DURATION;
}
export function upsertToast(items: ToastRecord[], input: ToastOptions, id: string): ToastRecord[] {
  const previous = items.find(item => item.id === id);
  const record = { ...input, id, variant: input.variant ?? 'default' as ToastVariant, duration: normalizeDuration(input.duration), revision: (previous?.revision ?? 0) + 1 };
  return previous ? items.map(item => item.id === id ? record : item) : [...items, record];
}
export function visibleToasts(items: ToastRecord[], maxVisible: number) {
  const count = Number.isFinite(maxVisible) ? Math.max(1, Math.floor(maxVisible)) : 3;
  return items.slice(0, count); // FIFO: queued items start their timer only when mounted.
}
export function remainingAfterPause(remaining: number, startedAt: number, now: number) {
  return Math.max(0, remaining - Math.max(0, now - startedAt));
}
export function shouldDismiss(dx: number, dy: number, vx: number, vy: number) {
  return Math.abs(dx) > 64 || Math.abs(dy) > 64 || (Math.abs(dx) > 12 && Math.abs(vx) > 0.6) || (Math.abs(dy) > 12 && Math.abs(vy) > 0.6);
}
