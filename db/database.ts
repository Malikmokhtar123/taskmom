import { DatabaseSync } from 'node:sqlite';
import path from 'path';

let db: DatabaseSync;

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(path.join(process.cwd(), 'taskmom.db'));
    db.exec(`
      CREATE TABLE IF NOT EXISTS children (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        dob TEXT
      );

      CREATE TABLE IF NOT EXISTS supplies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'units',
        daily_usage REAL NOT NULL DEFAULT 1,
        current_stock REAL NOT NULL DEFAULT 0,
        reorder_threshold REAL NOT NULL DEFAULT 14,
        pharmacy_url TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        send_at TEXT NOT NULL,
        sent INTEGER NOT NULL DEFAULT 0
      );
    `);
  }
  return db;
}
