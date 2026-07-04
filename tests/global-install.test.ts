import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const testHomeDir = mkdtempSync(join(tmpdir(), "global-home-"));

vi.mock("os", async (importOriginal) => {
  const os = await importOriginal<typeof import("os")>();
  return {
    ...os,
    homedir: () => testHomeDir,
  };
});

import { initDatabase, closeDatabase } from "../src/db/connection.js";
import { getAIClientByName } from "../src/core/registry.js";
import { loadLock, writeLock } from "../src/lock/manager.js";
import type { LockEntry } from "../src/types/skill.js";

describe("global install", () => {
  let projectDir: string;

  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(() => {
    closeDatabase();
    rmSync(testHomeDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "global-project-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("resolves AI client global path correctly", () => {
    const client = getAIClientByName("claude");
    expect(client).not.toBeNull();
    expect(client!.global_path).toBe("~/.config/opencode/skills/");
  });

  it("writes lock file with global mode", () => {
    const entry: LockEntry = {
      skill_id: 1,
      name: "base-app",
      category: "web",
      version: "1.0.0",
      hash: "abc",
      destination: "/some/global/path/base-app",
      mode: "global",
      installed_at: "2026-01-01T00:00:00Z",
    };
    writeLock(projectDir, [entry]);
    const lock = loadLock(projectDir);
    expect(lock).not.toBeNull();
    expect(lock!.skills[0].mode).toBe("global");
  });

  it("stores both local and global entries in same lock", () => {
    const local: LockEntry = {
      skill_id: 1, name: "local-skill", category: "web", version: "1.0.0",
      hash: "abc", destination: "/local", mode: "local", installed_at: "2026-01-01T00:00:00Z",
    };
    const global: LockEntry = {
      skill_id: 2, name: "global-skill", category: "tools", version: "1.0.0",
      hash: "def", destination: "/global", mode: "global", installed_at: "2026-01-01T00:00:00Z",
    };
    writeLock(projectDir, [local, global]);
    const lock = loadLock(projectDir);
    expect(lock!.skills).toHaveLength(2);
    expect(lock!.skills.filter((s) => s.mode === "local")).toHaveLength(1);
    expect(lock!.skills.filter((s) => s.mode === "global")).toHaveLength(1);
  });

  it("resolves global install path for claude", () => {
    const client = getAIClientByName("claude");
    expect(client).not.toBeNull();
    const globalPath = client!.global_path.replace("~/", testHomeDir + "/");
    expect(globalPath).toContain(".config/opencode/skills/");
    expect(globalPath.startsWith(testHomeDir)).toBe(true);
  });
});
