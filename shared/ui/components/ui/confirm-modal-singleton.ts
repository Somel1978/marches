// shared/ui/components/ui/confirm-modal-singleton.ts
// Module-level singleton — SSR-safe, no browser globals.

type ConfirmFn = (title: string, message: string) => Promise<boolean>;
let _fn: ConfirmFn | null = null;

export function registerConfirmModal(fn: ConfirmFn)  { _fn = fn; }
export function unregisterConfirmModal()              { _fn = null; }

export async function confirmModal(title: string, message: string): Promise<boolean> {
    if (!_fn) { console.warn('confirmModal: ConfirmModal not mounted'); return false; }
    return _fn(title, message);
}
