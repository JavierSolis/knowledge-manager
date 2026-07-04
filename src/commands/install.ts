import { loadConfig } from "../config/manager.js";
import { getSkillById, getAIClientByName } from "../core/registry.js";
import { installSkills } from "../core/installer.js";
import { selectQuestion, confirmQuestion } from "../ui/prompts.js";
import { withSpinner } from "../ui/spinner.js";
import { showSummaryBox, showDryRunMessage } from "../ui/display.js";
import { success, error as errorColor, warning, highlight } from "../ui/colors.js";
import { resolve } from "path";

export interface InstallCommandOptions {
  yes?: boolean;
  dryRun?: boolean;
}

export async function installCommand(
  skillIds: number[],
  options: InstallCommandOptions = {}
): Promise<void> {
  const config = loadConfig();
  if (!config) {
    console.log(errorColor("No hay configuración. Ejecutá 'knowledge-manager init' primero."));
    return;
  }

  if (skillIds.length === 0) {
    console.log(warning("No hay skills seleccionados para instalar."));
    return;
  }

  const skills = skillIds.map((id) => getSkillById(id)).filter(Boolean);
  const projectPath = resolve(".");

  const mode = await selectQuestion<"local" | "global">(
    "Modo de instalación:",
    [
      { name: "📁 Local → .claude/skills/  (este proyecto)", value: "local" },
      { name: "🌍 Global → ~/.config/opencode/skills/  (todos los proyectos)", value: "global" },
    ]
  );

  const aiClient = getAIClientByName(config.aiClient);
  const installPath = mode === "local"
    ? `${projectPath}/${aiClient?.local_path || ".claude/skills/"}`
    : `~/${aiClient?.global_path || ".config/opencode/skills/"}`;

  console.log("");
  console.log(highlight(`${skills.length} skills seleccionados → ${installPath}`));
  for (const skill of skills) {
    console.log(`  • ${skill?.category}/${skill?.name} (v${skill?.version})`);
  }
  console.log("");

  if (!options.yes) {
    const confirmed = await confirmQuestion("¿Confirmar instalación?");
    if (!confirmed) {
      console.log(warning("Instalación cancelada."));
      return;
    }
  }

  if (options.dryRun) {
    showDryRunMessage();
    console.log(success(`Se instalarían ${skills.length} skills en ${installPath}`));
    return;
  }

  const results = await Promise.all(
    skills.map((skill) =>
      withSpinner(`Instalando ${skill?.category}/${skill?.name}...`, async () => {
        const result = await installSkills(
          config.repositoryPath,
          projectPath,
          [skill!.id],
          mode,
          config.aiClient,
          { dryRun: false }
        );
        return result[0];
      })
    )
  );

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (failed.length > 0) {
    for (const f of failed) {
      console.log(errorColor(`${f.skillName}: ${f.error}`));
    }
  }

  showSummaryBox(
    "Instalación completada",
    [
      `${successful.length} skills instalados en modo ${mode}`,
      `Destino: ${installPath}`,
      ...successful.map((r) => `  • ${r.skillName}`),
      `Lock file: .skm-lock.json`,
    ],
    failed.length > 0 ? "yellow" : "green"
  );
}
