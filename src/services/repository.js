import { makeSeed } from "../data/seed.js";
export const DB_KEY = "sportivo_react_v1";
export class LocalRepository {
  constructor(storage) {
    this.storage = storage;
    this.queue = Promise.resolve();
  }
  read() {
    const raw = this.storage.getItem(DB_KEY);
    if (!raw) return makeSeed();
    try {
      const db = JSON.parse(raw);
      if (db.version !== 1 || !Array.isArray(db.users)) throw Error();
      return db;
    } catch {
      throw new Error(
        "Saved data could not be read. Export or clear this site’s storage in your browser settings.",
      );
    }
  }
  write(db) {
    try {
      this.storage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
      throw new Error(
        "Unable to save. Browser storage may be full or disabled.",
      );
    }
  }
  transaction(fn) {
    const task = this.queue.then(async () => {
      const db = this.read();
      const result = await fn(db);
      this.write(db);
      return result;
    });
    this.queue = task.catch(() => {});
    return task;
  }
}
// Implement this same boundary with HTTP calls when a server is available.
// MongoDB connection strings must ONLY exist on the server, never in VITE_* variables.
export class HttpRepository {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }
  async request(path, options = {}) {
    let url = this.baseUrl + path;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      const origin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : "http://localhost:3000";
      url = new URL(url, origin).toString();
    }
    const r = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw Error(body.message || `Request failed (${r.status})`);
    }
    return r.status === 204 ? null : r.json();
  }
}
