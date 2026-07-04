import { searchSkillsFts, getSkillById, getAIClientByName, isSkillInstalled } from "../core/registry.js";
import { loadConfig } from "../config/manager.js";
import { installSkills } from "../core/installer.js";
import { inputQuestion, searchCheckboxPrompt, simpleConfirm, keySelect } from "../ui/prompts.js";
import { showPreInstallBox, showDoneBox } from "../ui/display.js";
import type { DestAnalysis, SkillAnalysis } from "../ui/display.js";
import { info, error as errorColor, warning, success } from "../ui/colors.js";
import { existsSync, readFileSync } from "fs";
import { join, dirname, relative, resolve } from "path";
import { homedir } from "os";
import { createHash } from "crypto";

function analyzeDestination(
  skillIds: number[],
  mode: "local" | "global",
  projectPath: string,
): DestAnalysis | null {
  const config = loadConfig();
  if (!config) return null;

  const client = getAIClientByName(config.aiClient);
  if (!client) return null;

  const installPath = mode === "local"
    ? join(projectPath, client.local_path)
    : join(homedir(), client.global_path.replace("~/", ""));

  const parentExists = existsSync(dirname(installPath));

    const skills: SkillAnalysis[] = skillIds
      .map((id) => getSkillById(id))
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((skill) => {
        const skillDestPath = join(installPath, skill.name);
        const skMdPath = join(skillDestPath, "SKILL.md");
        const skillBasePath = join(config.repositoryPath, dirname(skill.path));

        if (!existsSync(skMdPath)) {
          return {
            id: skill.id,
            name: skill.name,
            category: skill.category,
            description: skill.description,
            status: "nueva",
            files: skill.files.length,
          } as SkillAnalysis;
        }

        let different = false;
        for (const file of skill.files) {
          if (file.path.endsWith("SKILL.md")) continue;
          const relPath = relative(skillBasePath, join(config.repositoryPath, file.path));
          const destFile = join(skillDestPath, relPath);
          if (!existsSync(destFile)) {
            different = true;
            break;
          }
          const content = readFileSync(destFile);
          const hash = createHash("sha256").update(content).digest("hex");
          if (hash !== file.hash) {
            different = true;
            break;
          }
        }

        return {
          id: skill.id,
          name: skill.name,
          category: skill.category,
          description: skill.description,
          status: different ? "diferente" as const : "idéntica" as const,
          files: skill.files.length,
        } as SkillAnalysis;
      });

  return { destinationPath: installPath, parentExists, skills };
}

export async function searchCommand(): Promise<void> {
  const config = loadConfig();
  if (!config) return;

  const projectPath = resolve(".");
  const mode = "local" as const;

  while (true) {
    const query = await inputQuestion(
      "Buscar skills (FTS5 — busca en nombre, categoría, tags, descripción):"
    );

    if (!query.trim()) return;

    let results = searchSkillsFts(query.trim());
    for (const r of results) {
      r.installed = isSkillInstalled(r.id, projectPath);
    }

    while (results.length > 0) {
      const selection = await searchCheckboxPrompt(results);

      if (selection.action === "quit") return;
      if (selection.action === "search") break;

      if (selection.selected.length === 0) {
        const action = await keySelect("¿Qué quieres hacer?", [
          { key: "s", label: "nueva búsqueda", value: "search" },
          { key: "q", label: "salir", value: "quit" },
        ]);
        if (action === "quit") return;
        break;
      }

      const analysis = analyzeDestination(selection.selected, mode, projectPath);
      if (!analysis) {
        console.log(errorColor("Error al analizar destino."));
        return;
      }

      showPreInstallBox(analysis);

      const confirmed = await simpleConfirm("¿Instalar estos skills?");

      if (!confirmed) {
        console.log(warning("Instalación cancelada."));
        const action = await keySelect("¿Qué quieres hacer?", [
          { key: "s", label: "nueva búsqueda", value: "search" },
          { key: "q", label: "salir", value: "quit" },
        ]);
        if (action === "quit") return;
        break;
      }

      console.log("");
      const installResults = [];
      for (const sid of selection.selected) {
        const skill = getSkillById(sid);
        const label = skill ? `${skill.category}/${skill.name}` : `skill #${sid}`;
        process.stdout.write(`  ${label}... `);

        const r = (
          await installSkills(config.repositoryPath, projectPath, [sid], mode, config.aiClient, {
            dryRun: false,
          })
        )[0];

        installResults.push(r);

        if (r.success) {
          console.log(success(`${r.filesCopied} archivos`));
        } else {
          console.log(errorColor(`falló: ${r.error}`));
        }
      }

      console.log("");
      showDoneBox(installResults, mode, analysis.destinationPath);

      const done = await keySelect("¿Qué quieres hacer ahora?", [
        { key: "s", label: "nueva búsqueda", value: "search" },
        { key: "q", label: "salir", value: "quit" },
      ]);

      if (done === "quit") return;
      break;
    }

    if (results.length === 0) {
      console.log("");
      console.log(info(`Sin resultados para "${query}".`));
      const action = await keySelect("¿Qué quieres hacer?", [
        { key: "s", label: "nueva búsqueda", value: "search" },
        { key: "q", label: "salir", value: "quit" },
      ]);
      if (action === "quit") return;
    }
  }
}
