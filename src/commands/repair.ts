import { loadConfig } from "../config/manager.js";
import { getSkillById, getAIClientByName } from "../core/registry.js";
import { loadLock, addToLock } from "../lock/manager.js";
import { info, success, warning, error as errorColor } from "../ui/colors.js";
import { withSpinner } from "../ui/spinner.js";
import { confirmQuestion, checkboxQuestion } from "../ui/prompts.js";
import { showSummaryBox } from "../ui/display.js";
import { resolve } from "path";
import { existsSync, mkdirSync, copyFileSync, rmSync, readFileSync } from "fs";
import { join, dirname, relative } from "path";
import { createHash } from "crypto";

function calculateFileHash(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

interface VerifyEntry {
  skillId: number;
  name: string;
  ok: boolean;
  errors: string[];
  missingFiles: string[];
}

function verifyInstalled(projectPath: string, skillId: number, skillName: string, lockHash: string, lockFiles?: { path: string; hash: string }[]): VerifyEntry {
  const errors: string[] = [];
  const missingFiles: string[] = [];

  const skillPath = join(projectPath, ".claude", "skills", skillName);
  if (!existsSync(skillPath)) {
    missingFiles.push(skillName);
    return { skillId, name: skillName, ok: false, errors, missingFiles };
  }

  const filesToCheck = lockFiles ?? [{ path: "SKILL.md", hash: lockHash }];

  for (const file of filesToCheck) {
    const fullPath = join(skillPath, file.path);
    if (!existsSync(fullPath)) {
      missingFiles.push(file.path);
      continue;
    }

    try {
      const actualHash = calculateFileHash(fullPath);
      if (actualHash !== file.hash) {
        errors.push(`${file.path}: hash mismatch`);
      }
    } catch {
      missingFiles.push(file.path);
    }
  }

  return { skillId, name: skillName, ok: errors.length === 0 && missingFiles.length === 0, errors, missingFiles };
}

async function reinstallSkill(projectPath: string, repoPath: string, skillId: number, skillName: string, aiClientName: string): Promise<boolean> {
  try {
    const skill = getSkillById(skillId);
    if (!skill) return false;

    const client = getAIClientByName(aiClientName);
    if (!client) return false;

    const installPath = join(projectPath, client.local_path);
    const skillInstallPath = join(installPath, skillName);

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

    return true;
  } catch {
    return false;
  }
}

export async function repairCommand(): Promise<void> {
  const config = loadConfig();
  if (!config) {
    console.log(warning("No hay configuración. Ejecutá 'knowledge-manager init' primero."));
    return;
  }

  const projectPath = resolve(".");
  const lock = loadLock(projectPath);
  if (!lock || lock.skills.length === 0) {
    console.log(info("No hay skills instalados en este proyecto."));
    return;
  }

  const results = lock.skills.map((entry) =>
    verifyInstalled(projectPath, entry.skill_id, entry.name, entry.hash, entry.files)
  );

  const corrupted = results.filter((r) => !r.ok);
  if (corrupted.length === 0) {
    console.log(success("Todos los skills están íntegros. No se necesita reparación."));
    return;
  }

  console.log(warning(`${corrupted.length} skills con problemas:`));
  for (const c of corrupted) {
    console.log(`  ${warning(c.name)}`);
    for (const err of c.errors) console.log(`    ${err}`);
    for (const mf of c.missingFiles) console.log(`    ${errorColor(`Falta: ${mf}`)}`);
  }
  console.log("");

  const selected = await checkboxQuestion("¿Qué skills quieres reparar?", corrupted.map((c) => ({ name: c.name, value: c.skillId, checked: true })));
  if (selected.length === 0) { console.log(info("No se seleccionaron skills.")); return; }

  const confirmed = await confirmQuestion(`¿Re-instalar ${selected.length} skills?`);
  if (!confirmed) { console.log(warning("Reparación cancelada.")); return; }

  const repairResults = await Promise.all(selected.map((skillId) => {
    const c = corrupted.find((r) => r.skillId === skillId);
    return withSpinner(`Reparando ${c?.name}...`, async () => {
      const ok = await reinstallSkill(projectPath, config.repositoryPath, skillId, c!.name, config.aiClient);
      return { name: c!.name, ok };
    });
  }));

  const repaired = repairResults.filter((r) => r.ok);
  const failed = repairResults.filter((r) => !r.ok);

  showSummaryBox("Reparación completada", [
    `${repaired.length} skills reparados`,
    ...repaired.map((r) => `  • ${r.name}`),
    ...(failed.length > 0 ? [`${errorColor(`${failed.length} fallaron`)}`] : []),
  ], failed.length > 0 ? "yellow" : "green");
}
