import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export const empty = () => ({implemented_stage:1, users:[], tokens:[], restaurants:[], reservations:[], receipts:[]});
export class Store {
  db: DatabaseSync;
  constructor(path = ':memory:') {
    if (path !== ':memory:') mkdirSync(dirname(path),{recursive:true});
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL)');
    this.db.prepare('INSERT OR IGNORE INTO state(id,payload) VALUES(1,?)').run(JSON.stringify(empty()));
  }
  transaction(fn: (state: any) => any, write = false) {
    this.db.exec(write ? 'BEGIN IMMEDIATE' : 'BEGIN');
    try {
      const s = JSON.parse(this.db.prepare('SELECT payload FROM state WHERE id=1').get().payload as string), result = fn(s);
      if (write) this.db.prepare('UPDATE state SET payload=? WHERE id=1').run(JSON.stringify(s));
      this.db.exec('COMMIT'); return result;
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  close() { this.db.close(); }
}
