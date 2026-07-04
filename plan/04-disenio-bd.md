# 04 — Diseño de Base de Datos (SQLite + FTS5)

## Recomendación: sql.js con FTS5

**Razones**:
- `sql.js` incluye **FTS5** (Full-Text Search) built-in
- Zero native modules → distribuible via `npx` sin compilación
- Síncrono para queries simples
- Approach similar a **Engram** (SQLite + FTS5)

> Si performance es crítica, migrar a `better-sqlite3` + compilar con FTS5 habilitado.

## FTS5 — Qué aporta

FTS5 es un índice de texto completo built-in de SQLite que permite:

| Feature | LIKE '%query%' | FTS5 |
|---------|---------------|------|
| Tokenización | No | Sí (stemming, stop words) |
| Ranking por relevancia | No | Sí (BM25) |
| Prefix search | No | Sí (`android*`) |
| Phrase search | No | Sí (`"base android"`) |
| Column targeting | No | Sí (`name:android`) |

**No es semántico (no usa embeddings)**, pero para buscar skills por nombre/tags/descripción es órdenes de magnitud mejor que LIKE.

## Schema Completo

```sql
-- Meta info (para migraciones)
CREATE TABLE _meta (
  version INTEGER NOT NULL
);
INSERT INTO _meta (version) VALUES (1);

-- AI Clients soportados
CREATE TABLE ai_clients (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT    NOT NULL UNIQUE,  -- 'claude', 'gemini-cli', 'codex-cli'
  label TEXT    NOT NULL,          -- 'Claude', 'Gemini CLI', 'Codex CLI'
  local_path  TEXT NOT NULL,       -- '.claude/skills/', relativo al proyecto
  global_path TEXT NOT NULL,       -- '~/.config/opencode/skills/', absoluto
  is_default  INTEGER NOT NULL DEFAULT 0
);

INSERT INTO ai_clients (name, label, local_path, global_path, is_default) VALUES
  ('claude',     'Claude',     '.claude/skills/',          '~/.config/opencode/skills/',  1),
  ('gemini-cli', 'Gemini CLI', '.gemini/skills/',          '~/.config/gemini/skills/',    0),
  ('codex-cli',  'Codex CLI',  '.codex/skills/',           '~/.config/codex/skills/',     0);

-- Repositorio de skills (metadata del source)
CREATE TABLE repository (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  path       TEXT    NOT NULL UNIQUE,
  version    TEXT    NOT NULL DEFAULT '1.0.0',
  scanned_at TEXT    NOT NULL DEFAULT (datetime('now')),
  hash       TEXT    NOT NULL    -- SHA-256 del estado del repo
);

-- Skills
CREATE TABLE skills (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id     INTEGER NOT NULL REFERENCES repository(id),
  name        TEXT    NOT NULL,
  category    TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  path        TEXT    NOT NULL,       -- Ruta relativa desde el repo
  version     TEXT    NOT NULL DEFAULT '1.0.0',
  priority    INTEGER NOT NULL DEFAULT 10,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Tags de cada skill
CREATE TABLE tags (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  tag      TEXT    NOT NULL
);

CREATE INDEX idx_tags_skill ON tags(skill_id);
CREATE INDEX idx_tags_tag ON tags(tag);

-- Archivos dentro de cada skill (con hash para verificación)
CREATE TABLE skill_files (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id  INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  path      TEXT    NOT NULL,
  hash      TEXT    NOT NULL,
  size      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_skill_files_skill ON skill_files(skill_id);

-- Skills instalados en proyectos (historial)
CREATE TABLE installed (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id     INTEGER NOT NULL REFERENCES skills(id),
  project_path TEXT    NOT NULL,
  ai_client_id INTEGER NOT NULL REFERENCES ai_clients(id),
  mode         TEXT    NOT NULL CHECK(mode IN ('local', 'global')),
  installed_at TEXT    NOT NULL DEFAULT (datetime('now')),
  hash         TEXT    NOT NULL
);

CREATE INDEX idx_installed_project ON installed(project_path);

-- ═══════════════════════════════════════════
-- FTS5 Virtual Table (como Engram)
-- ═══════════════════════════════════════════

CREATE VIRTUAL TABLE skills_fts USING fts5(
  name,
  category,
  description,
  tags,                          -- Tags concatenados: "android kotlin config"
  content='skills',              -- Tabla fuente
  content_rowid='id',             -- FK a skills.id
  tokenize='porter unicode61'    -- Stemming en inglés + Unicode
);

-- Triggers para mantener FTS5 sincronizado
CREATE TRIGGER skills_ai AFTER INSERT ON skills BEGIN
  INSERT INTO skills_fts(rowid, name, category, description, tags)
  VALUES (new.id, new.name, new.category, new.description, '');
END;

CREATE TRIGGER skills_ad AFTER DELETE ON skills BEGIN
  INSERT INTO skills_fts(skills_fts, rowid, name, category, description, tags)
  VALUES ('delete', old.id, old.name, old.category, old.description, '');
END;

CREATE TRIGGER skills_au AFTER UPDATE ON skills BEGIN
  INSERT INTO skills_fts(skills_fts, rowid, name, category, description, tags)
  VALUES ('delete', old.id, old.name, old.category, old.description, '');
  INSERT INTO skills_fts(rowid, name, category, description, tags)
  VALUES (new.id, new.name, new.category, new.description, '');
END;
```

## Diagrama ER

```
ai_clients
    │
repository (1) ──── (N) skills (1) ──── (N) skill_files
                              │
                              ├── (1) ──── (N) tags
                              │
                              └── (1) ──── (N) installed ──── (1) ai_clients

skills (1) ──── (1) skills_fts (FTS5 virtual table)
```

## Queries Principales

```sql
-- Búsqueda FTS5 (la joya de la corona)
-- tokenize='porter unicode61' → busca "android" y también "androids", "android's"
SELECT s.*, rank
FROM skills_fts
JOIN skills s ON s.id = skills_fts.rowid
WHERE skills_fts MATCH ?
ORDER BY rank;

-- Búsqueda con targeting de columna
SELECT s.*
FROM skills_fts
JOIN skills s ON s.id = skills_fts.rowid
WHERE skills_fts MATCH 'name: android';

-- Prefix search (autocomplete)
SELECT s.*
FROM skills_fts
JOIN skills s ON s.id = skills_fts.rowid
WHERE skills_fts MATCH 'base*';

-- Búsqueda por tags + FTS5 combinado
SELECT DISTINCT s.*
FROM skills s
JOIN tags t ON t.skill_id = s.id
WHERE s.id IN (
  SELECT rowid FROM skills_fts WHERE skills_fts MATCH ?
)
AND t.tag IN ('android', 'kotlin');

-- Skills por categoría
SELECT * FROM skills WHERE category = 'android' ORDER BY priority DESC;

-- Tags de un skill
SELECT tag FROM tags WHERE skill_id = ?;

-- Archivos de un skill (con hashes)
SELECT path, hash, size FROM skill_files WHERE skill_id = ?;

-- Ruta de instalación según AI client
SELECT local_path FROM ai_clients WHERE name = 'claude';
-- → '.claude/skills/'

-- Skills instalados en un proyecto
SELECT s.*, ac.name as ai_client, i.installed_at, i.mode
FROM installed i
JOIN skills s ON s.id = i.skill_id
JOIN ai_clients ac ON ac.id = i.ai_client_id
WHERE i.project_path = ?
ORDER BY i.installed_at DESC;

-- Detectar si el repo cambió
SELECT hash FROM repository WHERE path = ? ORDER BY id DESC LIMIT 1;
```

## Migraciones

Usamos migraciones SQL embebidas. Cada migración es un archivo en `src/db/migrations/`.

```
src/db/migrations/
├── 001-initial.sql     # Schema base + FTS5
├── 002-add-clients.sql # Si se agregan AI clients nuevos
└── ...
```

## Config Local

```
~/.config/skill-manager/
├── config.json     # Ruta repo, AI client activo, última versión
└── skills.db       # SQLite + FTS5 database
```

```json
{
  "repository_path": "/Users/javi/mis-skills",
  "repository_version": "1.0.0",
  "ai_client": "claude",
  "last_scanned": "2026-06-24T10:00:00Z"
}
```
