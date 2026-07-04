import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createHash } from "crypto";
import { verifySkillFiles, verifyLockEntry } from "../src/core/verifier.js";
import type { LockEntry } from "../src/types/skill.js";

describe("verifier", () => {
  it("verifies files with matching hashes", () => {
    const dir = mkdtempSync(join(tmpdir(), "verifier-test-"));
    writeFileSync(join(dir, "test.txt"), "hello world");
    const hash = createHash("sha256").update("hello world").digest("hex");
    const results = verifySkillFiles(dir, [{ path: "test.txt", hash }]);
    expect(results[0].ok).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  it("reports mismatch for incorrect hash", () => {
    const dir = mkdtempSync(join(tmpdir(), "verifier-test-"));
    writeFileSync(join(dir, "test.txt"), "hello world");
    const results = verifySkillFiles(dir, [
      { path: "test.txt", hash: "0000000000000000000000000000000000000000000000000000000000000000" },
    ]);
    expect(results[0].ok).toBe(false);
    expect(results[0].actual).not.toBe(results[0].expected);
    rmSync(dir, { recursive: true, force: true });
  });

  it("reports FILE_NOT_FOUND for missing files", () => {
    const dir = mkdtempSync(join(tmpdir(), "verifier-test-"));
    const results = verifySkillFiles(dir, [{ path: "nonexistent.txt", hash: "abc" }]);
    expect(results[0].ok).toBe(false);
    expect(results[0].actual).toBe("FILE_NOT_FOUND");
    rmSync(dir, { recursive: true, force: true });
  });

  it("verifies multiple files at once", () => {
    const dir = mkdtempSync(join(tmpdir(), "verifier-test-"));
    writeFileSync(join(dir, "a.txt"), "content a");
    writeFileSync(join(dir, "b.txt"), "content b");
    const hashA = createHash("sha256").update("content a").digest("hex");
    const results = verifySkillFiles(dir, [
      { path: "a.txt", hash: hashA },
      { path: "b.txt", hash: "wrong-hash" },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  it("verifies lock entry with matching hash", () => {
    const dir = mkdtempSync(join(tmpdir(), "verifier-lock-"));
    const skillDir = join(dir, ".claude", "skills", "my-skill");
    mkdirSync(skillDir, { recursive: true });
    const skillContent = "---\nname: test\n---\n# Test";
    writeFileSync(join(skillDir, "SKILL.md"), skillContent);
    const hash = createHash("sha256").update(skillContent).digest("hex");
    const entry: LockEntry = {
      skill_id: 1,
      name: "my-skill",
      category: "web",
      version: "1.0.0",
      hash,
      destination: ".claude/skills/my-skill",
      mode: "local",
      installed_at: "2026-01-01T00:00:00Z",
    };
    const result = verifyLockEntry(dir, entry);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    rmSync(dir, { recursive: true, force: true });
  });
});
