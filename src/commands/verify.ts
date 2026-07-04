import { loadConfig } from "../config/manager.js";
import { loadLock } from "../lock/manager.js";
import { info, success, warning, error as errorColor, dim } from "../ui/colors.js";
import { showSummaryBox } from "../ui/display.js";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

export interface VerifyResult {
  skillId: number;
  name: string;
  ok: boolean;
  errors: { file: string; expected: string; actual: string }[];
  missingFiles: string[];
}

function calculateFileHash(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

function verifyInstalledSkill(
  projectPath: string,
  skillId: number,
  skillName: string,
  lockHash: string,
  lockFiles?: { path: string; hash: string }[]
): VerifyResult {
  const errors: { file: string; expected: string; actual: string }[] = [];
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
        errors.push({ file: file.path, expected: file.hash, actual: actualHash });
      }
    } catch {
      missingFiles.push(file.path);
    }
  }

  return { skillId, name: skillName, ok: errors.length === 0 && missingFiles.length === 0, errors, missingFiles };
}

export async function verifyCommand(): Promise<void> {
  const config = loadConfig();
  if (!config) {
    console.log(warning("No hay configuración. Ejecutá 'skill-manager init' primero."));
    return;
  }

  const projectPath = resolve(".");
  const lock = loadLock(projectPath);

  if (!lock || lock.skills.length === 0) {
    console.log(info("No hay skills instalados en este proyecto."));
    return;
  }

  console.log(info(`Verificando ${lock.skills.length} skills instalados...`));
  console.log("");

  const results: VerifyResult[] = [];
  for (const entry of lock.skills) {
    const result = verifyInstalledSkill(projectPath, entry.skill_id, entry.name, entry.hash, entry.files);
    results.push(result);
  }

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  for (const r of results) {
    if (r.ok) {
      console.log(`  ${success(`${r.name}`)}`);
    } else {
      console.log(`  ${warning(`${r.name}`)}`);
      for (const err of r.errors) {
        const shortExpected = err.expected.substring(0, 12);
        const shortActual = err.actual.substring(0, 12);
        console.log(`    ${dim(`${err.file}: esperado ${shortExpected}... ≠ actual ${shortActual}...`)}`);
      }
      for (const mf of r.missingFiles) {
        console.log(`    ${errorColor(`Falta: ${mf}`)}`);
      }
    }
  }

  console.log("");
  showSummaryBox(
    "Verificación completada",
    [
      `${ok.length} skills OK`,
      ...(failed.length > 0 ? [`${errorColor(`${failed.length} skills con errores`)}`] : []),
    ],
    failed.length > 0 ? "yellow" : "green"
  );
}
