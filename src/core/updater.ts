import { readFileSync, existsSync, mkdirSync, copyFileSync, rmSync, readdirSync } from "fs";
import { join, dirname, relative } from "path";
import { createHash } from "crypto";
import { loadLock, addToLock } from "../lock/manager.js";
import { getSkillById, getAllSkills, getAIClientByName, getSkillRepositoryInfo } from "./registry.js";
import type { LockEntry, Skill } from "../types/skill.js";
import { loadConfig } from "../config/manager.js";

export interface DiffEntry {
  skillId: number;
  name: string;
  category: string;
  installedVersion: string;
  repoVersion: string;
  installedHash: string;
  repoHash: string;
  hasChanged: boolean;
  changedFiles: string[];
  needsUpdate: boolean;
}

export interface UpdateResult {
  skillId: number;
  name: string;
  success: boolean;
  error?: string;
  backedUp: boolean;
}

export interface UpdateOptions {
  dryRun?: boolean;
  yes?: boolean;
}

function calculateFileHash(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

function getInstallPath(projectPath: string): string {
  const configData = loadConfig();
  if (!configData) return "";
  const client = getAIClientByName(configData.aiClient);
  if (!client) return "";
  return join(projectPath, client.local_path);
}

export function detectChanges(projectPath: string, repoPath: string): DiffEntry[] {
  const lock = loadLock(projectPath);
  if (!lock) return [];

  const allSkills = getAllSkills();
  const diffs: DiffEntry[] = [];

  for (const entry of lock.skills) {
    const skill = allSkills.find((s) => s.id === entry.skill_id);
    if (!skill) {
      diffs.push({
        skillId: entry.skill_id,
        name: entry.name,
        category: entry.category,
        installedVersion: entry.version,
        repoVersion: "NOT_IN_REPO",
        installedHash: entry.hash,
        repoHash: "",
        hasChanged: false,
        changedFiles: [],
        needsUpdate: false,
      });
      continue;
    }

    const changedFiles: string[] = [];
    let needsUpdate = false;

    if (skill.version !== entry.version) {
      changedFiles.push(`Versión: ${entry.version} → ${skill.version}`);
      needsUpdate = true;
    }

    if (entry.files) {
      for (const file of entry.files) {
        const fullPath = join(entry.destination, file.path);
        if (!existsSync(fullPath)) {
          changedFiles.push(`${file.path} (no encontrado)`);
          needsUpdate = true;
          continue;
        }
        try {
          const actualHash = calculateFileHash(fullPath);
          if (actualHash !== file.hash) {
            changedFiles.push(`${file.path} (hash distinto)`);
            needsUpdate = true;
          }
        } catch {
          changedFiles.push(`${file.path} (error al leer)`);
          needsUpdate = true;
        }
      }
    } else {
      const installBase = getInstallPath(projectPath);
      if (!installBase) continue;

      const installedSkillPath = join(installBase, entry.name, "SKILL.md");
      if (existsSync(installedSkillPath)) {
        try {
          const installedHash = calculateFileHash(installedSkillPath);
          const repoHash = readFileSync(join(repoPath, skill.path.replace(/\/[^/]+$/, ""), "SKILL.md"), "utf-8");
          const repoHashCalc = createHash("sha256").update(repoHash).digest("hex");
          if (installedHash !== repoHashCalc) {
            changedFiles.push(`SKILL.md (hash distinto)`);
            needsUpdate = true;
          }
        } catch {
          changedFiles.push(`SKILL.md (error al leer)`);
          needsUpdate = true;
        }
      } else {
        changedFiles.push(`SKILL.md (no instalado)`);
        needsUpdate = true;
      }
    }

    diffs.push({
      skillId: entry.skill_id,
      name: entry.name,
      category: entry.category,
      installedVersion: entry.version,
      repoVersion: skill.version,
      installedHash: entry.hash,
      repoHash: skill.files[0]?.hash || "",
      hasChanged: needsUpdate,
      changedFiles,
      needsUpdate,
    });
  }

  return diffs;
}

function backupSkill(projectPath: string, skillName: string): { backupPath: string; success: boolean } {
  const configData = loadConfig();
  if (!configData) return { backupPath: "", success: false };
  const client = getAIClientByName(configData.aiClient);
  if (!client) return { backupPath: "", success: false };
  const installPath = join(projectPath, client.local_path);
  const skillPath = join(installPath, skillName);

  if (!existsSync(skillPath)) {
    return { backupPath: "", success: true };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(installPath, ".backups", timestamp);
  const destPath = join(backupPath, skillName);
  mkdirSync(destPath, { recursive: true });

  try {
    const entries = readdirSync(skillPath, { encoding: "utf-8", recursive: true });
    for (const entry of entries) {
      const fullPath = join(skillPath, entry);
      if (existsSync(fullPath) && !fullPath.endsWith(".backups")) {
        const dest = join(destPath, entry);
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(fullPath, dest);
      }
    }
    return { backupPath, success: true };
  } catch {
    return { backupPath, success: false };
  }
}

export async function updateSkills(
  projectPath: string,
  repoPath: string,
  skillIds: number[],
  options: UpdateOptions = {}
): Promise<UpdateResult[]> {
  const results: UpdateResult[] = [];

  for (const skillId of skillIds) {
    const skill = getSkillById(skillId);
    if (!skill) {
      results.push({ skillId, name: "unknown", success: false, error: "Skill not found", backedUp: false });
      continue;
    }

    if (options.dryRun) {
      results.push({ skillId, name: skill.name, success: true, backedUp: false });
      continue;
    }

    const backupResult = backupSkill(projectPath, skill.name);
    if (!backupResult.success) {
      results.push({ skillId, name: skill.name, success: false, error: "Backup failed", backedUp: false });
      continue;
    }

    try {
      const configData = loadConfig();
      if (!configData) throw new Error("No config");
      const client = getAIClientByName(configData.aiClient);
      if (!client) throw new Error("AI client not found");

      const installPath = join(projectPath, client.local_path);
      const skillInstallPath = join(installPath, skill.name);

      if (existsSync(skillInstallPath)) {
        rmSync(skillInstallPath, { recursive: true, force: true });
      }

      mkdirSync(skillInstallPath, { recursive: true });

      const sourceSkillPath = join(repoPath, skill.path.replace(/\/[^/]+$/, ""));
      const mainSource = join(sourceSkillPath, "SKILL.md");
      if (existsSync(mainSource)) {
        copyFileSync(mainSource, join(skillInstallPath, "SKILL.md"));
      }

      for (const file of skill.files) {
        const sourcePath = join(repoPath, file.path);
        const relPath = relative(join(repoPath, dirname(skill.path)), join(repoPath, file.path));
        const destPath = join(skillInstallPath, relPath);
        if (existsSync(sourcePath)) {
          mkdirSync(dirname(destPath), { recursive: true });
          copyFileSync(sourcePath, destPath);
        }
      }

      const skillDir = join(repoPath, dirname(skill.path));
      addToLock(projectPath, {
        skill_id: skill.id,
        name: skill.name,
        category: skill.category,
        version: skill.version,
        hash: skill.files.find(f => f.path.endsWith("SKILL.md"))?.hash || "",
        files: skill.files.map(f => ({
          path: relative(skillDir, join(repoPath, f.path)),
          hash: f.hash,
        })),
        destination: skillInstallPath,
        mode: "local",
        installed_at: new Date().toISOString(),
      });

      results.push({ skillId, name: skill.name, success: true, backedUp: backupResult.success });
    } catch (error) {
      results.push({ skillId, name: skill.name, success: false, error: error instanceof Error ? error.message : "Unknown error", backedUp: backupResult.success });
    }
  }

  return results;
}
