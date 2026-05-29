const DB_NAME = 'graver-ai-prototype';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('store')) {
        db.createObjectStore('store');
      }
    };
  });
}

export async function dbSet(namespace, key, value) {
  const db = await openDB();
  const fullKey = `${namespace}:${key}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('store', 'readwrite');
    const store = tx.objectStore('store');
    const req = store.put(value, fullKey);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet(namespace, key) {
  const db = await openDB();
  const fullKey = `${namespace}:${key}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('store', 'readonly');
    const store = tx.objectStore('store');
    const req = store.get(fullKey);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(namespace, key) {
  const db = await openDB();
  const fullKey = `${namespace}:${key}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('store', 'readwrite');
    const store = tx.objectStore('store');
    const req = store.delete(fullKey);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbKeys(namespace) {
  const db = await openDB();
  const prefix = `${namespace}:`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('store', 'readonly');
    const store = tx.objectStore('store');
    const req = store.getAllKeys();
    req.onsuccess = () => {
      const keys = req.result
        .filter((k) => typeof k === 'string' && k.startsWith(prefix))
        .map((k) => k.slice(prefix.length));
      resolve(keys);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function dbAllKeys() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('store', 'readonly');
    const store = tx.objectStore('store');
    const req = store.getAllKeys();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbClear(namespace) {
  const keys = await dbKeys(namespace);
  for (const key of keys) {
    await dbDelete(namespace, key);
  }
}
