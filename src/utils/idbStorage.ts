/**
 * High-performance, quota-free IndexedDB storage helper for large files, blobs,
 * audio/video buffers, and Safe Folder encrypted vault payloads.
 * Prevents localStorage 5MB overflow and WebView memory crashes.
 */

const DB_NAME = 'FilesByAkashKumarDB';
const DB_VERSION = 1;
const STORE_BLOBS = 'file_blobs';
const STORE_VAULT = 'safe_vault_encrypted';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
      if (!db.objectStoreNames.contains(STORE_VAULT)) {
        db.createObjectStore(STORE_VAULT);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save large file data (Blob, File, ArrayBuffer, or string) into IndexedDB
 */
export async function saveFileBlob(id: string, data: Blob | ArrayBuffer | string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readwrite');
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.put(data, id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error saving to IndexedDB:', err);
  }
}

/**
 * Get file data from IndexedDB
 */
export async function getFileBlob(id: string): Promise<Blob | ArrayBuffer | string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readonly');
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error reading from IndexedDB:', err);
    return null;
  }
}

/**
 * Delete file blob from IndexedDB
 */
export async function deleteFileBlob(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readwrite');
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error deleting from IndexedDB:', err);
  }
}

/**
 * Save encrypted payload into Safe Vault store
 */
export async function saveVaultItem(id: string, encryptedPayload: { iv: string; data: string }): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VAULT, 'readwrite');
      const store = tx.objectStore(STORE_VAULT);
      const req = store.put(encryptedPayload, id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error saving vault item to IndexedDB:', err);
  }
}

/**
 * Retrieve encrypted payload from Safe Vault store
 */
export async function getVaultItem(id: string): Promise<{ iv: string; data: string } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VAULT, 'readonly');
      const store = tx.objectStore(STORE_VAULT);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error reading vault item from IndexedDB:', err);
    return null;
  }
}

/**
 * Remove vault item
 */
export async function deleteVaultItem(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VAULT, 'readwrite');
      const store = tx.objectStore(STORE_VAULT);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error deleting vault item from IndexedDB:', err);
  }
}
