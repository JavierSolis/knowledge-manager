import { scanRepository, syncSkillsToDb, detectDuplicates, detectInstalledFromProject } from "../core/scanner.js";
import { getAIClients, getSkillRepositoryInfo, getSkillCount, getAIClientByName } from "../core/registry.js";
import { loadConfig, saveConfig, getDefaultConfig } from "../config/manager.js";
import { initDatabase } from "../db/connection.js";
import { inputQuestion, selectQuestion } from "../ui/prompts.js";
import { showWelcomeBox, showSummaryBox } from "../ui/display.js";
import { withSpinner } from "../ui/spinner.js";
import { success, info, warning } from "../ui/colors.js";
import { existsSync } from "fs";
import { resolve } from "path";

export async function initCommand(): Promise<void> {
  await initDatabase();
  showWelcomeBox();

  const existingConfig = loadConfig();

  const defaultPath = existingConfig?.repositoryPath || "";

  const repositoryPath = await inputQuestion(
    "¿Dónde está tu repositorio de skills?\n  (ruta completa o relativa)",
    { default: defaultPath, validate: (input: string) => {
      if (!input.trim()) return "La ruta no puede estar vacía";
      if (!existsSync(input.trim())) return "La ruta no existe. Verificá la ubicación de tu repositorio.";
      return true;
    }}
  );

  const aiClients = getAIClients();
  const aiClient = await selectQuestion("¿Qué AI client usas?", aiClients.map((c) => ({
    name: `${c.label}  (instala en ${c.local_path})`,
    value: c.name,
    description: `${c.label} → ${c.local_path}`,
  })));

  console.log("");

  const skills = await withSpinner("Escaneando repositorio...", async () => {
    return scanRepository(repositoryPath.trim());
  });

  const duplicates = detectDuplicates(skills);
  if (duplicates.size > 0) {
    console.log(warning("Skills duplicados encontrados:"));
    for (const [name, paths] of duplicates) {
      console.log(`  ${name}:`);
      for (const p of paths) {
        console.log(`    - ${p}`);
      }
    }
    console.log(warning("Corrige los duplicados en tu repositorio y ejecuta 'knowledge-manager rescan'."));
    console.log("");
  }

  await withSpinner("Indexando búsqueda FTS5...", async () => {
    syncSkillsToDb(repositoryPath.trim(), "1.0.0", skills);
  });

  const projectPath = resolve(".");
  const client = getAIClientByName(aiClient);
  const installedCount = detectInstalledFromProject(
    projectPath,
    client?.local_path || ".claude/skills/",
    client?.id ?? 1,
  );

  saveConfig({
    repositoryPath: repositoryPath.trim(),
    repositoryVersion: "1.0.0",
    aiClient,
    lastScanned: new Date().toISOString(),
  });

  const initLines = [
    success(`Repositorio escaneado: ${skills.length} skills encontrados`),
    success(`AI Client: ${aiClient}`),
    info("Usá 'knowledge-manager search' para buscar skills"),
    info("Usá 'knowledge-manager install' para instalar"),
  ];
  if (installedCount > 0) {
    initLines.push(info(`${installedCount} skills detectados como instalados`));
  }
  showSummaryBox("Configuración completada", initLines);
}

export async function reinitCommand(): Promise<void> {
  const config = loadConfig();
  if (!config) {
    console.log(warning("No hay configuración previa. Ejecutá 'knowledge-manager init' primero."));
    return;
  }

  const repoInfo = getSkillRepositoryInfo();
  if (repoInfo) {
    console.log(info(`Repositorio: ${repoInfo.path} (${getSkillCount()} skills)`));
    console.log(info(`Último escaneo: ${repoInfo.scanned_at}`));
  }

  const skills = await withSpinner("Re-escaneando repositorio...", async () => {
    return scanRepository(config.repositoryPath);
  });

  const duplicates = detectDuplicates(skills);
  if (duplicates.size > 0) {
    console.log(warning("Skills duplicados encontrados:"));
    for (const [name, paths] of duplicates) {
      console.log(`  ${name}:`);
      for (const p of paths) {
        console.log(`    - ${p}`);
      }
    }
    console.log(warning("Corrige los duplicados en tu repositorio y ejecuta 'knowledge-manager rescan' de nuevo."));
    console.log("");
  }

  await withSpinner("Re-indexando FTS5...", async () => {
    syncSkillsToDb(config.repositoryPath, config.repositoryVersion, skills);
  });

  const projectPath = resolve(".");
  const client = getAIClientByName(config.aiClient);
  const installedCount = detectInstalledFromProject(
    projectPath,
    client?.local_path || ".claude/skills/",
    client?.id ?? 1,
  );

  config.lastScanned = new Date().toISOString();
  saveConfig(config);

  const summaryLines = [success(`${skills.length} skills sincronizados`)];
  if (installedCount > 0) {
    summaryLines.push(info(`${installedCount} skills detectados como instalados`));
  }
  showSummaryBox("Re-escaneo completado", summaryLines);
}
