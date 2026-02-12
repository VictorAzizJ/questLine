type StorageArea = "local" | "sync";

function area(which: StorageArea) {
  return which === "sync" ? chrome.storage.sync : chrome.storage.local;
}

export async function storageGet<T>(
  key: string,
  which: StorageArea = "local"
): Promise<T | undefined> {
  return await new Promise<T | undefined>((resolve, reject) => {
    area(which).get(key, (result) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      const record = result as Record<string, unknown>;
      resolve(record[key] as T | undefined);
    });
  });
}

export async function storageSet<T>(
  key: string,
  value: T,
  which: StorageArea = "local"
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    area(which).set({ [key]: value }, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve();
    });
  });
}

export async function storageRemove(key: string, which: StorageArea = "local"): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    area(which).remove(key, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve();
    });
  });
}

export function storageOnChanged(
  listener: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void
) {
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
