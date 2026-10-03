import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ApiError } from './errors.js';
export const empty = () => ({implemented_stage:2, users:[], tokens:[], restaurants:[], reservations:[], receipts:[]});
export class Store {
  db: DatabaseSync;
  constructor(path = ':memory:') {
    if (path !== ':memory:') mkdirSync(dirname(path),{recursive:true});
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL)');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS physical_reservations (
        restaurant_id TEXT NOT NULL,
        table_id TEXT NOT NULL,
        starts_at INTEGER NOT NULL,
        ends_at INTEGER NOT NULL,
        reservation_id TEXT NOT NULL
      );
      CREATE TRIGGER IF NOT EXISTS prevent_double_booking
      BEFORE INSERT ON physical_reservations
      FOR EACH ROW
      BEGIN
        SELECT RAISE(ABORT, 'table_unavailable')
        WHERE EXISTS (
          SELECT 1 FROM physical_reservations
          WHERE restaurant_id = NEW.restaurant_id
            AND table_id = NEW.table_id
            AND starts_at < NEW.ends_at
            AND ends_at > NEW.starts_at
            AND reservation_id != NEW.reservation_id
        );
      END;
    `);
    this.db.prepare('INSERT OR IGNORE INTO state(id,payload) VALUES(1,?)').run(JSON.stringify(empty()));
  }
  transaction(fn: (state: any) => any, write = false) {
    this.db.exec(write ? 'BEGIN IMMEDIATE' : 'BEGIN');
    try {
      const s = JSON.parse(this.db.prepare('SELECT payload FROM state WHERE id=1').get().payload as string), result = fn(s);
      if (write) {
        this.db.prepare('UPDATE state SET payload=? WHERE id=1').run(JSON.stringify(s));
        this.db.exec('DELETE FROM physical_reservations');
        const insert = this.db.prepare('INSERT INTO physical_reservations(restaurant_id, table_id, starts_at, ends_at, reservation_id) VALUES(?,?,?,?,?)');
        for (const r of s.reservations) {
          if (r.status === 'confirmed') {
            for (const table_id of r.table_ids) {
              insert.run(r.restaurant_id, table_id, Date.parse(r.starts_at), Date.parse(r.ends_at), r.reservation_id);
            }
          }
        }
      }
      this.db.exec('COMMIT'); return result;
    } catch (e) {
      this.db.exec('ROLLBACK');
      if (e instanceof Error && e.message === 'table_unavailable') throw new ApiError(409, 'table_unavailable');
      throw e;
    }
  }
  close() { this.db.close(); }
}
