import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { loadLock, writeLock, addToLock, removeFromLock, getInstalledFromLock } from "../src/lock/manager.js";
import type { LockEntry } from "../src/types/skill.js";

describe("lock manager", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "lock-test-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("returns null when no lock file exists", () => {
    const lock = loadLock(projectDir);
    expect(lock).toBeNull();
  });

  it("writes and reads lock file", () => {
    const entry: LockEntry = {
      skill_id: 1,
      name: "base-app",
      category: "web",
      version: "1.0.0",
      hash: "abc123",
      destination: "/some/path",
      mode: "local",
      installed_at: "2026-01-01T00:00:00Z",
    };
    writeLock(projectDir, [entry]);
    const lock = loadLock(projectDir);
    expect(lock).not.toBeNull();
    expect(lock!.skills).toHaveLength(1);
    expect(lock!.skills[0].name).toBe("base-app");
  });

  it("adds entry to existing lock file", () => {
    const entry1: LockEntry = {
      skill_id: 1, name: "skill1", category: "web", version: "1.0.0",
      hash: "abc", destination: "/p1", mode: "local", installed_at: "2026-01-01T00:00:00Z",
    };
    const entry2: LockEntry = {
      skill_id: 2, name: "skill2", category: "testing", version: "1.0.0",
      hash: "def", destination: "/p2", mode: "local", installed_at: "2026-01-01T00:00:00Z",
    };
    addToLock(projectDir, entry1);
    addToLock(projectDir, entry2);
    const lock = loadLock(projectDir);
    expect(lock!.skills).toHaveLength(2);
  });

  it("replaces existing entry with same skill_id", () => {
    const entry1: LockEntry = {
      skill_id: 1, name: "old", category: "web", version: "1.0.0",
      hash: "abc", destination: "/p1", mode: "local", installed_at: "2026-01-01T00:00:00Z",
    };
    const entry2: LockEntry = {
      skill_id: 1, name: "new", category: "web", version: "2.0.0",
      hash: "def", destination: "/p2", mode: "local", installed_at: "2026-02-01T00:00:00Z",
    };
    addToLock(projectDir, entry1);
    addToLock(projectDir, entry2);
    const lock = loadLock(projectDir);
    expect(lock!.skills).toHaveLength(1);
    expect(lock!.skills[0].version).toBe("2.0.0");
  });

  it("removes entry from lock file", () => {
    const entry: LockEntry = {
      skill_id: 1, name: "skill1", category: "web", version: "1.0.0",
      hash: "abc", destination: "/p1", mode: "local", installed_at: "2026-01-01T00:00:00Z",
    };
    addToLock(projectDir, entry);
    removeFromLock(projectDir, 1);
    const lock = loadLock(projectDir);
    expect(lock!.skills).toHaveLength(0);
  });

  it("returns installed skills from lock", () => {
    const entry: LockEntry = {
      skill_id: 1, name: "base-app", category: "web", version: "1.0.0",
      hash: "abc", destination: "/p1", mode: "local", installed_at: "2026-01-01T00:00:00Z",
    };
    addToLock(projectDir, entry);
    const installed = getInstalledFromLock(projectDir);
    expect(installed).toHaveLength(1);
    expect(installed[0].name).toBe("base-app");
  });

  it("creates valid JSON lock file on disk", () => {
    const entry: LockEntry = {
      skill_id: 1, name: "test", category: "web", version: "1.0.0",
      hash: "abc", destination: "/d", mode: "local", installed_at: "2026-01-01T00:00:00Z",
    };
    writeLock(projectDir, [entry]);
    const lockPath = join(projectDir, ".km-lock.json");
    expect(existsSync(lockPath)).toBe(true);
    const raw = readFileSync(lockPath, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.version).toBe("1");
    expect(parsed.skills).toHaveLength(1);
  });
});
