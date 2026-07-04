import { getInstalledSkills, getSkillById, getSkillRepositoryInfo, getSkillCount } from "../core/registry.js";
import { loadConfig } from "../config/manager.js";
import { showSummaryBox } from "../ui/display.js";
import { info, success, highlight, warning } from "../ui/colors.js";

export async function statusCommand(): Promise<void> {
  const config = loadConfig();
  if (!config) {
    console.log(warning("No hay configuración. Ejecutá 'skill-manager init' primero."));
    return;
  }

  const repoInfo = getSkillRepositoryInfo();
  console.log(highlight("Configuración:"));
  console.log(`  ${info("Repo:")}     ${config.repositoryPath || "—"}`);
  console.log(`  ${info("AI Client:")} ${config.aiClient || "—"}`);
  console.log(`  ${info("Skills DB:")}  ${repoInfo ? `${repoInfo.path} (${getSkillCount()} skills)` : "—"}`);
  console.log(`  ${info("Último:")}   ${config.lastScanned || "—"}`);
  console.log("");

  const projectPath = process.cwd();
  const installed = getInstalledSkills(projectPath);

  if (installed.length === 0) {
    showSummaryBox("Status", [
      info("No hay skills instalados en este proyecto."),
      info("Usá 'skill-manager search' para buscar e instalar."),
    ]);
    return;
  }

  console.log(highlight("Skills instalados en este proyecto:"));
  console.log("");

  const SEP = "─".repeat(60);

  for (const skill of installed) {
    const skillInfo = getSkillById(skill.skill_id);
    console.log(SEP);
    console.log(`${highlight(`${skill.skill_category}/${skill.skill_name}`)}`);
    console.log(`  ${info("Hash:")}       ${skill.hash.substring(0, 16)}…`);
    console.log(`  ${info("Modo:")}       ${skill.mode}`);
    console.log(`  ${info("Instalado:")}  ${skill.installed_at}`);
    if (skillInfo && skillInfo.files.length > 0) {
      console.log(`  ${info("Archivos:")}`);
      for (const f of skillInfo.files) {
        console.log(`    ${f.path}`);
      }
    }
  }
  console.log(SEP);

  showSummaryBox("Resumen", [
    success(`${installed.length} skills instalados`),
    info(`Proyecto: ${projectPath}`),
    info("Usá 'verify' para chequear integridad, 'update' para actualizar."),
  ]);
}
