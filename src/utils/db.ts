/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

const DB_NAME = 'DesktopPetCompanionDB';
const DB_VERSION = 1;
const STORE_NAME = 'custom_assets';

export interface DBFileRecord {
  key: string;       // e.g. 'idle_12345678'
  feature: string;   // e.g. 'idle', 'eating'
  id: string;        // unique string identifier
  name: string;      // file name
  type: 'image' | 'video';
  blob: Blob;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };
    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

export async function saveFileToDB(feature: string, id: string, name: string, type: 'image' | 'video', blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const record: DBFileRecord = {
      key: `${feature}_${id}`,
      feature,
      id,
      name,
      type,
      blob,
    };
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteFileFromDB(feature: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(`${feature}_${id}`);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllFilesFromDB(): Promise<DBFileRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = (event: any) => {
      resolve(event.target.result || []);
    };
    request.onerror = () => reject(request.error);
  });
}
