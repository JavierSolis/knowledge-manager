#!/usr/bin/env node

import { Command } from "commander";
import { loadConfig } from "./config/manager.js";
import { getSkillRepositoryInfo, getSkillCount } from "./core/registry.js";
import { initDatabase } from "./db/connection.js";
import { initCommand } from "./commands/init.js";
import { searchCommand } from "./commands/search.js";
import { listCommand } from "./commands/list.js";
import { updateCommand } from "./commands/update.js";
import { rescanCommand } from "./commands/rescan.js";
import { resetCommand } from "./commands/reset.js";
import { statusCommand } from "./commands/status.js";
import { info, success, error } from "./ui/colors.js";

const program = new Command();

program
  .name("skill-manager")
  .alias("skm")
  .description("CLI para instalar AI agent skills desde un repositorio local")
  .version("1.0.0");

program
  .command("init")
  .description("Configurar repositorio de skills y AI client")
  .action(async () => {
    await initCommand();
  });

program
  .command("search")
  .description("Buscar e instalar skills del repositorio")
  .action(async () => {
    await initDatabase();
    const config = loadConfig();
    if (!config) {
      console.log(info("Primera vez. Ejecutando setup inicial..."));
      await initCommand();
      return;
    }

    const repoInfo = getSkillRepositoryInfo();
    if (repoInfo) {
      console.log(success(`Repositorio: ${repoInfo.path} (${getSkillCount()} skills)`));
    }
    console.log(success(`AI Client: ${config.aiClient}`));
    console.log("");

    try {
      await searchCommand();
    } catch (e) {
      console.log(error(`Error: ${(e as Error).message}`));
      console.log(info("Probá con 'skill-manager rescan' primero."));
    }
  });

program
  .command("install")
  .description("Buscar e instalar skills del repositorio")
  .action(async () => {
    await initDatabase();
    const config = loadConfig();
    if (!config) {
      console.log(info("Primera vez. Ejecutando setup inicial..."));
      await initCommand();
      return;
    }

    try {
      await searchCommand();
    } catch (e) {
      console.log(error(`Error: ${(e as Error).message}`));
      console.log(info("Probá con 'skill-manager rescan' primero."));
    }
  });

program
  .command("list")
  .description("Listar skills instalados")
  .option("-g, --global", "Listar skills instalados globalmente")
  .action(async (opts) => {
    await initDatabase();
    await listCommand({ global: opts.global });
  });

program
  .command("update")
  .description("Actualizar skills instalados")
  .option("-y, --yes", "Skip confirmaciones")
  .option("--dry-run", "Simular sin copiar archivos")
  .action(async (opts) => {
    await initDatabase();
    await updateCommand({ yes: opts.yes, dryRun: opts.dryRun });
  });

program
  .command("rescan")
  .description("Re-escanear repositorio de skills")
  .action(async () => {
    await initDatabase();
    await rescanCommand();
  });

program
  .command("reset")
  .description("Resetear instalación: elimina DB y configuración")
  .option("-f, --force", "Skip confirmación")
  .action(async (opts) => {
    await resetCommand(opts.force);
  });

program
  .command("status")
  .description("Mostrar skills instalados con hash y origen")
  .action(async () => {
    await initDatabase();
    await statusCommand();
  });

program
  .command("help")
  .description("Mostrar ayuda con todos los comandos disponibles")
  .action(() => {
    program.help();
  });

program
  .command("conflict")
  .description("Detectar y resolver conflictos entre skills instalados y el repositorio")
  .action(async () => {
    await initDatabase();
    const { conflictCommand } = await import("./commands/conflict.js");
    await conflictCommand();
  });

program
  .command("verify")
  .description("Verificar integridad de skills instalados")
  .action(async () => {
    await initDatabase();
    const { verifyCommand } = await import("./commands/verify.js");
    await verifyCommand();
  });

program
  .command("repair")
  .description("Re-instalar skills corruptos")
  .action(async () => {
    await initDatabase();
    const { repairCommand } = await import("./commands/repair.js");
    await repairCommand();
  });

program
  .command("steal")
  .description("Detectar skills instalados que no están en el repositorio y extraerlos a skill_steal/")
  .action(async () => {
    await initDatabase();
    const { stealCommand } = await import("./commands/steal.js");
    await stealCommand();
  });

program.parse(process.argv);
