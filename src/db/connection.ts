import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS _meta (
  version INTEGER NOT NULL
);

INSERT INTO _meta (version) VALUES (1);

CREATE TABLE IF NOT EXISTS ai_clients (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT    NOT NULL UNIQUE,
  label TEXT    NOT NULL,
  local_path  TEXT NOT NULL,
  global_path TEXT NOT NULL,
  is_default  INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO ai_clients (name, label, local_path, global_path, is_default) VALUES
  ('claude',     'Claude',     '.claude/skills/',          '~/.config/opencode/skills/',  1),
  ('gemini-cli', 'Gemini CLI', '.gemini/skills/',          '~/.config/gemini/skills/',    0),
  ('codex-cli',  'Codex CLI',  '.codex/skills/',           '~/.config/codex/skills/',     0);

CREATE TABLE IF NOT EXISTS repository (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  path       TEXT    NOT NULL UNIQUE,
  version    TEXT    NOT NULL DEFAULT '1.0.0',
  scanned_at TEXT    NOT NULL DEFAULT (datetime('now')),
  hash       TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id     INTEGER NOT NULL REFERENCES repository(id),
  name        TEXT    NOT NULL,
  category    TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  path        TEXT    NOT NULL,
  version     TEXT    NOT NULL DEFAULT '1.0.0',
  priority    INTEGER NOT NULL DEFAULT 10,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  tag      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tags_skill ON tags(skill_id);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);

CREATE TABLE IF NOT EXISTS skill_files (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id  INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  path      TEXT    NOT NULL,
  hash      TEXT    NOT NULL,
  size      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_skill_files_skill ON skill_files(skill_id);

CREATE TABLE IF NOT EXISTS installed (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id     INTEGER NOT NULL REFERENCES skills(id),
  project_path TEXT    NOT NULL,
  ai_client_id INTEGER NOT NULL REFERENCES ai_clients(id),
  mode         TEXT    NOT NULL CHECK(mode IN ('local', 'global')),
  installed_at TEXT    NOT NULL DEFAULT (datetime('now')),
  hash         TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_installed_project ON installed(project_path);

CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts USING fts4(
  name,
  category,
  description,
  tags,
  tokenize='porter'
);

CREATE TRIGGER IF NOT EXISTS skills_ai AFTER INSERT ON skills BEGIN
  INSERT INTO skills_fts(rowid, name, category, description, tags)
  VALUES (new.id, new.name, new.category, new.description, '');
END;

CREATE TRIGGER IF NOT EXISTS skills_ad AFTER DELETE ON skills BEGIN
  DELETE FROM skills_fts WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS skills_au AFTER UPDATE ON skills BEGIN
  DELETE FROM skills_fts WHERE rowid = old.id;
  INSERT INTO skills_fts(rowid, name, category, description, tags)
  VALUES (new.id, new.name, new.category, new.description, '');
END;
`;

let db: SqlJsDatabase | null = null;
let dbPath: string = "";

function getDbPath(): string {
  const configDir = join(homedir(), ".config", "skill-manager");
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  return join(configDir, "skills.db");
}

export async function initDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();
  dbPath = getDbPath();

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  if (needsMigration(db)) {
    db.run(MIGRATION_SQL);
    saveDatabase();
  }
  return db;
}

function needsMigration(database: SqlJsDatabase): boolean {
  const result = database.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='_meta'");
  return result.length === 0;
}

export function getDatabase(): SqlJsDatabase {
  if (!db) throw new Error("Database not initialized. Call initDatabase() first.");
  return db;
}

export function saveDatabase(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}
