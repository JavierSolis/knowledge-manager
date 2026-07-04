import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const testHomeDir = mkdtempSync(join(tmpdir(), "registry-home-"));

vi.mock("os", async (importOriginal) => {
  const os = await importOriginal<typeof import("os")>();
  return {
    ...os,
    homedir: () => testHomeDir,
  };
});

import { initDatabase, closeDatabase, getDatabase, saveDatabase } from "../src/db/connection.js";
import {
  searchSkillsFts,
  getAllSkills,
  getSkillById,
  getAIClients,
  getSkillCount,
} from "../src/core/registry.js";
import type { SqlJsDatabase } from "sql.js";

function setupSchema(db: SqlJsDatabase) {
  db.run("CREATE TABLE IF NOT EXISTS _meta (version INTEGER NOT NULL)");
  db.run("INSERT INTO _meta (version) VALUES (1)");

  db.run(
    `CREATE TABLE IF NOT EXISTS ai_clients (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT    NOT NULL UNIQUE,
      label TEXT    NOT NULL,
      local_path  TEXT NOT NULL,
      global_path TEXT NOT NULL,
      is_default  INTEGER NOT NULL DEFAULT 0
    )`
  );

  db.run(
    `INSERT OR IGNORE INTO ai_clients (name, label, local_path, global_path, is_default) VALUES
      ('claude',     'Claude',     '.claude/skills/',          '~/.config/opencode/skills/',  1),
      ('gemini-cli', 'Gemini CLI', '.gemini/skills/',          '~/.config/gemini/skills/',    0),
      ('codex-cli',  'Codex CLI',  '.codex/skills/',           '~/.config/codex/skills/',     0)`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS repository (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      path       TEXT    NOT NULL UNIQUE,
      version    TEXT    NOT NULL DEFAULT '1.0.0',
      scanned_at TEXT    NOT NULL DEFAULT (datetime('now')),
      hash       TEXT    NOT NULL
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS skills (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id     INTEGER NOT NULL REFERENCES repository(id),
      name        TEXT    NOT NULL,
      category    TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      path        TEXT    NOT NULL,
      version     TEXT    NOT NULL DEFAULT '1.0.0',
      priority    INTEGER NOT NULL DEFAULT 10,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS tags (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      tag      TEXT    NOT NULL
    )`
  );

  db.run("CREATE INDEX IF NOT EXISTS idx_tags_skill ON tags(skill_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag)");

  db.run(
    `CREATE TABLE IF NOT EXISTS skill_files (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      skill_id  INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      path      TEXT    NOT NULL,
      hash      TEXT    NOT NULL,
      size      INTEGER NOT NULL DEFAULT 0
    )`
  );
  db.run("CREATE INDEX IF NOT EXISTS idx_skill_files_skill ON skill_files(skill_id)");
}

function seedData(db: SqlJsDatabase) {
  db.run("INSERT INTO repository (path, version, hash) VALUES (?, ?, ?)", [
    "/test/repo",
    "1.0.0",
    "abc",
  ]);
  const repoId = db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;

  db.run(
    "INSERT INTO skills (repo_id, name, category, description, path, version, priority) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [repoId, "base-app", "web", "Base web application setup", "web/base-app/index.js", "1.0.0", 10]
  );
  const skillId1 = db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;
  for (const tag of ["web", "javascript", "base"]) {
    db.run("INSERT INTO tags (skill_id, tag) VALUES (?, ?)", [skillId1, tag]);
  }

  db.run(
    "INSERT INTO skills (repo_id, name, category, description, path, version, priority) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [repoId, "react-app", "web", "React application setup", "web/react-app/", "1.0.0", 8]
  );
  const skillId2 = db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;
  for (const tag of ["react", "javascript", "frontend"]) {
    db.run("INSERT INTO tags (skill_id, tag) VALUES (?, ?)", [skillId2, tag]);
  }

  db.run(
    "INSERT INTO skills (repo_id, name, category, description, path, version, priority) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [repoId, "vitest", "testing", "Vitest configuration", "testing/vitest/", "1.0.0", 10]
  );
  const skillId3 = db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;
  for (const tag of ["vitest", "testing"]) {
    db.run("INSERT INTO tags (skill_id, tag) VALUES (?, ?)", [skillId3, tag]);
  }
}

describe("registry", () => {
  beforeAll(async () => {
    await initDatabase();
    const db = getDatabase();
    setupSchema(db);
    seedData(db);
    saveDatabase();
  });

  afterAll(() => {
    closeDatabase();
    rmSync(testHomeDir, { recursive: true, force: true });
  });

  it("returns all skills from database", () => {
    const skills = getAllSkills();
    expect(skills.length).toBeGreaterThanOrEqual(3);
  });

  it("returns correct skill count", () => {
    const count = getSkillCount();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("searches skills by FTS5 query (falls back to LIKE)", () => {
    const results = searchSkillsFts("react");
    expect(results.length).toBeGreaterThanOrEqual(1);
    const reactSkill = results.find((r) => r.name === "react-app");
    expect(reactSkill).toBeDefined();
  });

  it("searches skills by category", () => {
    const results = searchSkillsFts("testing");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.name === "vitest")).toBe(true);
  });

  it("returns empty array for non-matching query", () => {
    const results = searchSkillsFts("xyznonexistent");
    expect(results).toHaveLength(0);
  });

  it("gets skill by ID", () => {
    const skills = getAllSkills();
    expect(skills.length).toBeGreaterThan(0);
    const skill = getSkillById(skills[0].id);
    expect(skill).not.toBeNull();
    expect(skill!.name).toBe(skills[0].name);
  });

  it("returns null for non-existent skill ID", () => {
    const skill = getSkillById(-1);
    expect(skill).toBeNull();
  });

  it("includes tags when getting all skills", () => {
    const skills = getAllSkills();
    const webSkill = skills.find((s) => s.name === "base-app");
    expect(webSkill).toBeDefined();
    expect(webSkill!.tags.length).toBeGreaterThan(0);
    expect(webSkill!.tags).toContain("web");
  });

  it("returns AI clients list", () => {
    const clients = getAIClients();
    expect(clients.length).toBeGreaterThanOrEqual(3);
    const claude = clients.find((c) => c.name === "claude");
    expect(claude).toBeDefined();
    expect(claude!.local_path).toBe(".claude/skills/");
    expect(claude!.is_default).toBe(true);
  });
});
