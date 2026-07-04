import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { initDatabase, closeDatabase, getDatabase } from "../src/db/connection.js";
import { loadLock, writeLock } from "../src/lock/manager.js";
import { syncSkillsToDb, scanRepository } from "../src/core/scanner.js";
import { detectChanges, updateSkills } from "../src/core/updater.js";
import { saveConfig } from "../src/config/manager.js";
import type { LockEntry } from "../src/types/skill.js";

var mockHomeDir: string;

vi.mock("os", async (importOriginal) => {
  const os = await importOriginal();
  const { mkdtempSync } = await import("fs");
  const { join } = await import("path");
  const { tmpdir } = await import("os");
  const dir = mkdtempSync(join(tmpdir(), "updater-home-"));
  mockHomeDir = dir;
  return { ...os, homedir: () => dir };
});

function createTestRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "updater-repo-"));
  const skillDir = join(dir, "catalog", "skills", "web", "base-app");
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(skillDir, "SKILL.md"),
    `---
name: base-app
version: 2.0.0
category: web
description: "Updated version"
tags: [web]
priority: 10
author: "Test"
license: MIT
ai_clients:
  - claude
dependencies: []
conflicts: []
updated_at: "2026-06-24"
---

# Base App v2
`
  );
  writeFileSync(join(skillDir, "index.js"), "console.log('v2');");
  return dir;
}

describe("updater", () => {
  let repoDir: string;
  let projectDir: string;

  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(() => {
    closeDatabase();
    if (mockHomeDir) {
      rmSync(mockHomeDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    repoDir = createTestRepo();
    projectDir = mkdtempSync(join(tmpdir(), "updater-project-"));
    mkdirSync(join(projectDir, ".claude", "skills"), { recursive: true });
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("detects no changes when no skills are installed", () => {
    const diffs = detectChanges(projectDir, repoDir);
    expect(diffs).toHaveLength(0);
  });

  it("detects changes when installed version differs from repo", () => {
    const skills = scanRepository(repoDir);
    syncSkillsToDb(repoDir, "1.0.0", skills);
    saveConfig({
      repositoryPath: repoDir,
      repositoryVersion: "1.0.0",
      aiClient: "claude",
      lastScanned: "2026-06-24T00:00:00Z",
    });

    const oldEntry: LockEntry = {
      skill_id: 1,
      name: "base-app",
      category: "web",
      version: "1.0.0",
      hash: "oldhash",
      destination: join(projectDir, ".claude/skills/base-app"),
      mode: "local",
      installed_at: "2026-01-01T00:00:00Z",
    };
    writeLock(projectDir, [oldEntry]);

    const diffs = detectChanges(projectDir, repoDir);
    const baseApp = diffs.find((d) => d.name === "base-app");
    expect(baseApp).toBeDefined();
    expect(baseApp!.needsUpdate).toBe(true);
  });

  function getSkillId(): number {
    const db = getDatabase();
    const result = db.exec("SELECT id FROM skills WHERE name = 'base-app' LIMIT 1");
    return result[0]?.values[0]?.[0] as number;
  }

  it("creates backup before updating", async () => {
    const skills = scanRepository(repoDir);
    syncSkillsToDb(repoDir, "1.0.0", skills);
    const skillId = getSkillId();
    saveConfig({
      repositoryPath: repoDir,
      repositoryVersion: "1.0.0",
      aiClient: "claude",
      lastScanned: "2026-06-24T00:00:00Z",
    });

    const installPath = join(projectDir, ".claude", "skills", "base-app");
    mkdirSync(installPath, { recursive: true });
    writeFileSync(join(installPath, "SKILL.md"), "old content");

    const entry: LockEntry = {
      skill_id: skillId,
      name: "base-app",
      category: "web",
      version: "1.0.0",
      hash: "abc",
      destination: installPath,
      mode: "local",
      installed_at: "2026-01-01T00:00:00Z",
    };
    writeLock(projectDir, [entry]);

    const results = await updateSkills(projectDir, repoDir, [skillId], { dryRun: false });
    expect(results[0].success).toBe(true);
    expect(results[0].backedUp).toBe(true);

    const backupDir = join(projectDir, ".claude", "skills", ".backups");
    expect(existsSync(backupDir)).toBe(true);
  });

  it("performs dry-run without modifying files", async () => {
    const skills = scanRepository(repoDir);
    syncSkillsToDb(repoDir, "1.0.0", skills);
    const skillId = getSkillId();
    saveConfig({
      repositoryPath: repoDir,
      repositoryVersion: "1.0.0",
      aiClient: "claude",
      lastScanned: "2026-06-24T00:00:00Z",
    });

    const installPath = join(projectDir, ".claude", "skills", "base-app");
    mkdirSync(installPath, { recursive: true });
    writeFileSync(join(installPath, "SKILL.md"), "old content");

    const entry: LockEntry = {
      skill_id: skillId,
      name: "base-app",
      category: "web",
      version: "1.0.0",
      hash: "abc",
      destination: installPath,
      mode: "local",
      installed_at: "2026-01-01T00:00:00Z",
    };
    writeLock(projectDir, [entry]);

    const results = await updateSkills(projectDir, repoDir, [skillId], { dryRun: true });
    expect(results[0].success).toBe(true);
    const oldContent = readFileSync(join(installPath, "SKILL.md"), "utf-8");
    expect(oldContent).toBe("old content");
  });
});
