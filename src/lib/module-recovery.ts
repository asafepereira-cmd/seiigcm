const RECOVERY_KEY = "ccm-module-recovery";
const RETRY_INTERVAL = 60_000;

export function isModuleLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Unable to preload CSS|Loading chunk .+ failed/i.test(message);
}

export function recoverModuleLoad(error: unknown, storage: Pick<Storage, "getItem" | "setItem">, reload: () => void, now = Date.now()): boolean {
  if (!isModuleLoadError(error)) return false;
  try {
    const previous = storage.getItem(RECOVERY_KEY);
    if (previous !== null && now - Number(previous) < RETRY_INTERVAL) return false;
    storage.setItem(RECOVERY_KEY, String(now));
  } catch {
    // Never create a reload loop when browser storage is unavailable.
    return false;
  }
  reload();
  return true;
}