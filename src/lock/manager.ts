import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import type { SkillLock, LockEntry } from "../types/skill.js";

function getLockPath(projectPath: string): string {
  return join(projectPath, ".skm-lock.json");
}

export function loadLock(projectPath: string): SkillLock | null {
  const lockPath = getLockPath(projectPath);
  if (!existsSync(lockPath)) return null;

  try {
    const raw = readFileSync(lockPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.skills)) return null;
    return parsed as SkillLock;
  } catch {
    return null;
  }
}

export function writeLock(projectPath: string, entries: LockEntry[]): void {
  const lock: SkillLock = {
    version: "1",
    skills: entries,
    updated_at: new Date().toISOString(),
  };
  writeFileSync(getLockPath(projectPath), JSON.stringify(lock, null, 2), "utf-8");
}

export function addToLock(projectPath: string, entry: LockEntry): void {
  const lock = loadLock(projectPath) || { version: "1", skills: [], updated_at: "" };
  lock.skills = lock.skills.filter((s) => s.skill_id !== entry.skill_id);
  lock.skills.push(entry);
  lock.updated_at = new Date().toISOString();
  writeFileSync(getLockPath(projectPath), JSON.stringify(lock, null, 2), "utf-8");
}

export function removeFromLock(projectPath: string, skillId: number): void {
  const lock = loadLock(projectPath);
  if (!lock) return;
  lock.skills = lock.skills.filter((s) => s.skill_id !== skillId);
  lock.updated_at = new Date().toISOString();
  writeFileSync(getLockPath(projectPath), JSON.stringify(lock, null, 2), "utf-8");
}

export function getInstalledFromLock(projectPath: string): LockEntry[] {
  const lock = loadLock(projectPath);
  return lock?.skills || [];
}
