import { existsSync, readFileSync, readdirSync, cpSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import matter from "gray-matter";
import { loadConfig } from "../config/manager.js";
import { getAIClientByName } from "../core/registry.js";
import { stealCheckboxPrompt } from "../ui/steal-prompt.js";
import type { StealCandidate } from "../ui/steal-prompt.js";
import { info, success, warning, dim, bold, cyan, yellow, error as errColor } from "../ui/colors.js";

function parseSkillMd(skillDir: string): { name: string; category: string; description: string } | null {
  const skMdPath = join(skillDir, "SKILL.md");
  if (!existsSync(skMdPath)) return null;
  try {
    const content = readFileSync(skMdPath, "utf-8");
    const parsed = matter(content);
    const data = parsed.data as Record<string, unknown>;
    return {
      name: (data.name as string) || skillDir.split("/").pop() || "unknown",
      category: (data.category as string) || "sin-categoria",
      description: (data.description as string) || "",
    };
  } catch {
    return null;
  }
}

function countFiles(dir: string): number {
  let count = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) count++;
      else if (entry.isDirectory()) count += countFiles(join(dir, entry.name));
    }
  } catch {
    // ignore
  }
  return count;
}

export async function stealCommand(): Promise<void> {
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

  const collectionPath = join(config.repositoryPath, "catalog", "skills");
  const stealPath = join(projectPath, "skill_steal");

  const entries = readdirSync(installPath, { withFileTypes: true });
  const candidates: StealCandidate[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillDir = join(installPath, entry.name);
    const meta = parseSkillMd(skillDir);
    if (!meta) continue;

    const inCollection = existsSync(join(collectionPath, entry.name));
    if (inCollection) continue;

    candidates.push({
      name: meta.name,
      category: meta.category,
      description: meta.description,
      sourcePath: skillDir,
      sourceFiles: countFiles(skillDir),
    });
  }

  if (candidates.length === 0) {
    console.log(success("Todos los skills instalados ya están en el repositorio. No hay candidatos."));
    return;
  }

  console.log("");
  const selection = await stealCheckboxPrompt(candidates);

  if (selection.action === "quit" || selection.selected.length === 0) {
    console.log(info("Extracción cancelada."));
    return;
  }

  const toExtract = candidates.filter((c) => selection.selected.includes(c.name));

  if (!existsSync(stealPath)) {
    mkdirSync(stealPath, { recursive: true });
  }

  console.log("");
  let extracted = 0;
  let skipped = 0;

  for (const candidate of toExtract) {
    const dest = join(stealPath, candidate.name);

    if (existsSync(dest)) {
      process.stdout.write(`  ${dim(`${candidate.name}`)} ${warning("ya existe en skill_steal/")}\n`);
      skipped++;
      continue;
    }

    try {
      cpSync(candidate.sourcePath, dest, { recursive: true });
      process.stdout.write(`  ${success("✔")} ${bold(candidate.name)} ${dim(`(${candidate.sourceFiles} archivos → skill_steal/${candidate.name}/)`)}\n`);
      extracted++;
    } catch (e) {
      process.stdout.write(`  ${errColor("✘")} ${bold(candidate.name)} ${dim(`error: ${(e as Error).message}`)}\n`);
    }
  }

  console.log("");
  console.log(
    success(
      `Extraídos ${extracted} skills a ${cyan(stealPath)}. ` +
      `${dim("Revisalos y movelos manualmente a catalog/skills/ cuando quieras.")}`,
    ),
  );
  if (skipped > 0) {
    console.log(warning(`${skipped} skills ya existían en skill_steal/ y se saltaron.`));
  }
}
