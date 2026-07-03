import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const globalForDb = globalThis as typeof globalThis & { __payrollinDb?: Database.Database };

function getDbPath() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "payrollin.db");
}

function createDb() {
  const db = new Database(getDbPath());
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_key TEXT NOT NULL UNIQUE,
      date_label TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      status TEXT NOT NULL,
      location TEXT,
      latitude REAL,
      longitude REAL,
      accuracy REAL,
      photo TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export function getDb() {
  if (!globalForDb.__payrollinDb) {
    globalForDb.__payrollinDb = createDb();
  }
  return globalForDb.__payrollinDb;
}
