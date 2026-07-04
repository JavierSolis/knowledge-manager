import { mkdirSync, copyFileSync, readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname, relative, resolve } from "path";
import { getSkillById, getAIClientByName } from "./registry.js";
import { getDatabase, saveDatabase } from "../db/connection.js";
import { addToLock } from "../lock/manager.js";
import type { LockEntry } from "../types/skill.js";
import { createHash } from "crypto";

export interface InstallOptions {
  dryRun?: boolean;
  yes?: boolean;
}

export interface InstallResult {
  skillId: number;
  skillName: string;
  success: boolean;
  error?: string;
  filesCopied: number;
  verified: boolean;
  hashMismatches: string[];
}

function getInstallPath(
  projectPath: string,
  mode: "local" | "global",
  aiClientName: string
): string {
  const client = getAIClientByName(aiClientName);
  if (!client) throw new Error(`AI client "${aiClientName}" not found`);

  if (mode === "local") {
    return join(projectPath, client.local_path);
  }
  const homedir = require("os").homedir();
  return join(homedir, client.global_path.replace("~/", ""));
}

function calculateHash(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function installSkill(
  repoPath: string,
  projectPath: string,
  skillId: number,
  mode: "local" | "global",
  aiClientName: string,
  options: InstallOptions = {}
): Promise<InstallResult> {
  const skill = getSkillById(skillId);
  if (!skill) {
    return { skillId, skillName: "unknown", success: false, error: "Skill not found in database", filesCopied: 0, verified: false, hashMismatches: [] };
  }

  const installPath = getInstallPath(projectPath, mode, aiClientName);
  const skillInstallPath = join(installPath, skill.name);

  if (options.dryRun) {
    return {
      skillId,
      skillName: skill.name,
      success: true,
      filesCopied: skill.files.length + 1,
      verified: true,
      hashMismatches: [],
    };
  }

  try {
    if (!existsSync(skillInstallPath)) {
      mkdirSync(skillInstallPath, { recursive: true });
    }

    let filesCopied = 0;
    const mainContent = readFileSync(join(repoPath, skill.path.replace(/\/[^/]+$/, ""), "SKILL.md"));
    const mainDest = join(skillInstallPath, "SKILL.md");
    const dir = dirname(mainDest);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    copyFileSync(join(repoPath, skill.path.replace(/\/[^/]+$/, ""), "SKILL.md"), mainDest);
    filesCopied++;

    const skillDir = join(repoPath, dirname(skill.path));

    for (const file of skill.files) {
      if (file.path.endsWith("SKILL.md")) continue;
      const sourcePath = join(repoPath, file.path);
      const destPath = join(skillInstallPath, relative(skillDir, sourcePath));
      const destDir = dirname(destPath);

      if (existsSync(sourcePath)) {
        if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
        copyFileSync(sourcePath, destPath);
        filesCopied++;
      }
    }

    let verified = true;
    const hashMismatches: string[] = [];
    for (const file of skill.files) {
      if (file.path.endsWith("SKILL.md")) continue;
      const sourcePath = join(repoPath, file.path);
      if (existsSync(sourcePath)) {
        const destPath = join(skillInstallPath, relative(skillDir, sourcePath));
        if (existsSync(destPath)) {
          const destContent = readFileSync(destPath);
          const actualHash = createHash("sha256").update(destContent).digest("hex");
          if (actualHash !== file.hash) {
            verified = false;
            hashMismatches.push(file.path);
          }
        }
      }
    }

    const lockEntry: LockEntry = {
      skill_id: skillId,
      name: skill.name,
      category: skill.category,
      version: skill.version,
      hash: skill.files.find(f => f.path.endsWith("SKILL.md"))?.hash || "",
      files: skill.files.map(f => ({
        path: relative(skillDir, join(repoPath, f.path)),
        hash: f.hash,
      })),
      destination: skillInstallPath,
      mode,
      installed_at: new Date().toISOString(),
    };

    addToLock(projectPath, lockEntry);

    const db = getDatabase();
    const client = getAIClientByName(aiClientName);
    const clientId = client?.id ?? 0;
    const skMdHash = skill.files.find(f => f.path.endsWith("SKILL.md"))?.hash || "";
    db.run(
      "INSERT INTO installed (skill_id, project_path, ai_client_id, mode, hash) VALUES (?, ?, ?, ?, ?)",
      [skillId, projectPath, clientId, mode, skMdHash]
    );
    saveDatabase();

    return { skillId, skillName: skill.name, success: true, filesCopied, verified, hashMismatches };
  } catch (error) {
    return {
      skillId,
      skillName: skill.name,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      filesCopied: 0,
      verified: false,
      hashMismatches: [],
    };
  }
}

export async function installSkills(
  repoPath: string,
  projectPath: string,
  skillIds: number[],
  mode: "local" | "global",
  aiClientName: string,
  options: InstallOptions = {}
): Promise<InstallResult[]> {
  const results: InstallResult[] = [];
  for (const skillId of skillIds) {
    const result = await installSkill(repoPath, projectPath, skillId, mode, aiClientName, options);
    results.push(result);
  }
  return results;
}
