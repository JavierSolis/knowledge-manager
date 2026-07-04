import { existsSync, readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { createHash } from "crypto";
import { loadConfig } from "../config/manager.js";
import { getDatabase } from "../db/connection.js";
import { getAIClientByName, getSkillById } from "../core/registry.js";
import { installSkill } from "../core/installer.js";
import { simpleConfirm, keySelect } from "../ui/prompts.js";
import { info, success, warning, dim, green, yellow, error as errColor } from "../ui/colors.js";
import { showSummaryBox } from "../ui/display.js";
import { showFileDiff } from "../ui/diff.js";

function fileHash(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export async function conflictCommand(): Promise<void> {
  const config = loadConfig();
  if (!config) {
    console.log(errColor("No hay configuración. Ejecutá 'skill-manager init' primero."));
    return;
  }

  const projectPath = resolve(".");
  const client = getAIClientByName(config.aiClient);
  if (!client) {
    console.log(errColor("AI Client no encontrado."));
    return;
  }

  const installPath = join(projectPath, client.local_path);
  if (!existsSync(installPath)) {
    console.log(info("No hay skills instalados en este proyecto."));
    return;
  }

  const db = getDatabase();
  const entries = readdirSync(installPath, { withFileTypes: true });

  type ConflictType = "match" | "name-conflict" | "hash-conflict" | "orphan";
  interface Conflict {
    dirName: string;
    type: ConflictType;
    dbSkill?: { id: number; name: string };
  }

  const conflicts: Conflict[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(installPath, entry.name);
    const skMdPath = join(dir, "SKILL.md");
    if (!existsSync(skMdPath)) continue;

    const projectHash = fileHash(skMdPath);

    const nameResult = db.exec(
      `SELECT s.id, sf.hash FROM skills s
       JOIN skill_files sf ON sf.skill_id = s.id
       WHERE s.name = ? AND sf.path LIKE '%/SKILL.md'`,
      [entry.name],
    );

    if (nameResult[0]?.values.length) {
      const dbId = nameResult[0].values[0][0] as number;
      const dbHash = nameResult[0].values[0][1] as string;
      if (dbHash === projectHash) {
        conflicts.push({ dirName: entry.name, type: "match", dbSkill: { id: dbId, name: entry.name } });
      } else {
        conflicts.push({ dirName: entry.name, type: "name-conflict", dbSkill: { id: dbId, name: entry.name } });
      }
      continue;
    }

    const hashResult = db.exec(
      `SELECT s.id, s.name FROM skills s
       JOIN skill_files sf ON sf.skill_id = s.id
       WHERE sf.path LIKE '%/SKILL.md' AND sf.hash = ?
       LIMIT 1`,
      [projectHash],
    );

    if (hashResult[0]?.values.length) {
      conflicts.push({
        dirName: entry.name,
        type: "hash-conflict",
        dbSkill: { id: hashResult[0].values[0][0] as number, name: hashResult[0].values[0][1] as string },
      });
    } else {
      conflicts.push({ dirName: entry.name, type: "orphan" });
    }
  }

  const matches = conflicts.filter((c) => c.type === "match");
  const nameConflicts = conflicts.filter((c) => c.type === "name-conflict");
  const hashConflicts = conflicts.filter((c) => c.type === "hash-conflict");
  const orphans = conflicts.filter((c) => c.type === "orphan");

  console.log("");
  console.log(info("Analizando skills instalados..."));
  console.log("");

  for (const c of matches) {
    console.log(`  ${green("✔")} ${c.dirName} — sincronizado`);
  }

  let synced = 0;
  let skipped = 0;

  for (const c of nameConflicts) {
    console.log(`  ${yellow("⚠")} ${c.dirName} — mismo nombre, contenido diferente`);
    while (true) {
      const action = await keySelect("¿Qué querés hacer?", [
        { key: "d", label: "ver diff", value: "diff" },
        { key: "s", label: "sobrescribir con versión del repositorio", value: "sync" },
        { key: "k", label: "saltar", value: "skip" },
      ]);
      if (action === "diff") {
        const installedPath = join(projectPath, client.local_path, c.dirName, "SKILL.md");
        const skill = getSkillById(c.dbSkill!.id);
        if (skill) {
          showFileDiff(installedPath, join(config.repositoryPath, skill.path), c.dirName);
        }
        continue;
      }
      if (action === "sync") {
        const result = await installSkill(
          config.repositoryPath,
          projectPath,
          c.dbSkill!.id,
          "local",
          config.aiClient,
          {},
        );
        if (result.success) {
          console.log(`  ${green("✔")} ${c.dirName} actualizado (${result.filesCopied} archivos)`);
          synced++;
        } else {
          console.log(`  ${errColor(`✘ ${c.dirName}: ${result.error}`)}`);
        }
      } else {
        skipped++;
      }
      break;
    }
    console.log("");
  }

  for (const c of hashConflicts) {
    console.log(`  ${yellow("⚠")} ${c.dirName} → coincide con '${c.dbSkill!.name}' del repositorio`);
    while (true) {
      const action = await keySelect("¿Qué querés hacer?", [
        { key: "d", label: "ver diff", value: "diff" },
        { key: "s", label: "sincronizar con versión del repositorio", value: "sync" },
        { key: "k", label: "saltar", value: "skip" },
      ]);
      if (action === "diff") {
        const installedPath = join(projectPath, client.local_path, c.dirName, "SKILL.md");
        const skill = getSkillById(c.dbSkill!.id);
        if (skill) {
          showFileDiff(installedPath, join(config.repositoryPath, skill.path), c.dbSkill!.name);
        }
        continue;
      }
      if (action === "sync") {
        const result = await installSkill(
          config.repositoryPath,
          projectPath,
          c.dbSkill!.id,
          "local",
          config.aiClient,
          {},
        );
        if (result.success) {
          console.log(`  ${green("✔")} ${c.dirName} sincronizado como '${c.dbSkill!.name}' (${result.filesCopied} archivos)`);
          synced++;
        } else {
          console.log(`  ${errColor(`✘ ${c.dirName}: ${result.error}`)}`);
        }
      } else {
        skipped++;
      }
      break;
    }
    console.log("");
  }

  for (const c of orphans) {
    console.log(`  ${dim("?")} ${c.dirName} — no encontrado en el repositorio`);
  }

  if (orphans.length > 0) {
    console.log(`  ${dim("Los skills huérfanos no se modifican.")}`);
    console.log("");
  }

  showSummaryBox("Conflicto resuelto", [
    matches.length > 0 ? `${matches.length} skills sincronizados` : null,
    nameConflicts.length > 0 ? `${nameConflicts.length} conflictos de nombre` : null,
    hashConflicts.length > 0 ? `${hashConflicts.length} conflictos de hash` : null,
    synced > 0 ? `${green(`${synced} skills actualizados`)}` : null,
    skipped > 0 ? `${warning(`${skipped} saltados`)}` : null,
  ].filter((l): l is string => l !== null));
}
