import { loadConfig } from "../config/manager.js";
import { loadLock } from "../lock/manager.js";
import { detectChanges, updateSkills } from "../core/updater.js";
import { checkboxQuestion, confirmQuestion } from "../ui/prompts.js";
import { withSpinner } from "../ui/spinner.js";
import { showSummaryBox, showDryRunMessage } from "../ui/display.js";
import { success, warning, error as errorColor, info, highlight, dim } from "../ui/colors.js";
import { resolve } from "path";

export interface UpdateCommandOptions {
  yes?: boolean;
  dryRun?: boolean;
}

export async function updateCommand(options: UpdateCommandOptions = {}): Promise<void> {
  const config = loadConfig();
  if (!config) {
    console.log(warning("No hay configuración. Ejecutá 'skill-manager init' primero."));
    return;
  }

  const projectPath = resolve(".");
  const repoPath = config.repositoryPath;

  const lock = loadLock(projectPath);
  if (!lock || lock.skills.length === 0) {
    console.log(info("No hay skills instalados en este proyecto."));
    return;
  }

  console.log(info(`Verificando ${lock.skills.length} skills instalados vs repositorio...`));
  console.log("");

  const diffs = detectChanges(projectPath, repoPath);
  const updatable = diffs.filter((d) => d.needsUpdate);

  if (updatable.length === 0) {
    showSummaryBox("Todos los skills están actualizados", [
      `${diffs.length} skills verificados, ninguno necesita update.`,
    ], "blue");
    return;
  }

  console.log(warning(`${updatable.length} skills desactualizados encontrados:`));
  console.log("");

  for (const diff of updatable) {
    console.log(`  ${warning("⚠")} ${highlight(`${diff.category}/${diff.name}`)}`);
    console.log(`     Instalado: v${diff.installedVersion} | Repo: v${diff.repoVersion}`);
    for (const file of diff.changedFiles) {
      console.log(`     ${dim(file)}`);
    }
    console.log("");
  }

  if (options.dryRun) {
    showDryRunMessage();
    console.log(success(`Se actualizarían ${updatable.length} skills.`));
    return;
  }

  const selected = await checkboxQuestion(
    "¿Qué skills quieres actualizar?",
    updatable.map((d) => ({
      name: `${d.category}/${d.name}  v${d.installedVersion} → v${d.repoVersion}`,
      value: d.skillId,
      checked: true,
    }))
  );

  if (selected.length === 0) {
    console.log(info("No se seleccionaron skills para actualizar."));
    return;
  }

  console.log(warning("Los archivos existentes serán reemplazados."));
  console.log(info("Backup automático: .claude/skills/.backups/"));
  console.log("");

  if (!options.yes) {
    const confirmed = await confirmQuestion(
      `¿Actualizar ${selected.length} skills seleccionados?`
    );
    if (!confirmed) {
      console.log(warning("Update cancelado."));
      return;
    }
  }

  const results = await Promise.all(
    selected.map((skillId) => {
      const diff = updatable.find((d) => d.skillId === skillId);
      return withSpinner(
        `Actualizando ${diff?.category}/${diff?.name}...`,
        async () => {
          const res = await updateSkills(projectPath, repoPath, [skillId], { dryRun: false });
          return res[0];
        }
      );
    })
  );

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (failed.length > 0) {
    for (const f of failed) {
      console.log(errorColor(`${f.name}: ${f.error}`));
    }
  }

  const backupInfo = successful.some((r) => r.backedUp)
    ? "Backup creado en .claude/skills/.backups/"
    : "";

  showSummaryBox(
    "Update completado",
    [
      `${successful.length} skills actualizados`,
      ...successful.map((r) => `  • ${r.name}${r.backedUp ? " (backup ✓)" : ""}`),
      backupInfo,
    ],
    failed.length > 0 ? "yellow" : "green"
  );
}
