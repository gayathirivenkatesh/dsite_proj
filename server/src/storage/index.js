import { LocalStorageDriver } from './local.storage.js';

let storageInstance = null;

export function getStorageDriver() {
  if (!storageInstance) {
    storageInstance = new LocalStorageDriver();
  }
  return storageInstance;
}

export const storage = getStorageDriver();

