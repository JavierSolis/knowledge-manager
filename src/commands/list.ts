import { loadConfig } from "../config/manager.js";
import { getInstalledSkills, getAIClientByName } from "../core/registry.js";
import { loadLock } from "../lock/manager.js";
import { showInstalledList } from "../ui/display.js";
import { warning, info } from "../ui/colors.js";
import { resolve } from "path";
import { homedir } from "os";

export interface ListCommandOptions {
  global?: boolean;
}

export async function listCommand(options: ListCommandOptions = {}): Promise<void> {
  const config = loadConfig();
  if (!config) {
    console.log(warning("No hay configuración. Ejecutá 'knowledge-manager init' primero."));
    return;
  }

  if (options.global) {
    const client = getAIClientByName(config.aiClient);
    if (!client) {
      console.log(warning("AI Client no encontrado."));
      return;
    }
    const globalPath = client.global_path.replace("~/", homedir() + "/");
    const installed = getInstalledFromGlobal(globalPath);
    if (installed.length === 0) {
      console.log(info("No hay skills instalados globalmente."));
      return;
    }
    console.log(info(`Skills globales (${globalPath}):`));
    console.log("");
    for (const skill of installed) {
      console.log(`  • ${skill.category}/${skill.name} (v${skill.version})`);
    }
    console.log("");
    console.log(info(`${installed.length} skills globales instalados.`));
    return;
  }

  const projectPath = resolve(".");
  const installed = getInstalledSkills(projectPath);

  if (installed.length === 0) {
    console.log(warning("No hay skills instalados en este proyecto."));
    return;
  }

  showInstalledList(installed);
}

function getInstalledFromGlobal(globalPath: string): { name: string; category: string; version: string }[] {
  const lock = loadLock(globalPath);
  if (!lock) return [];
  return lock.skills.filter((s) => s.mode === "global").map((s) => ({
    name: s.name,
    category: s.category,
    version: s.version,
  }));
}
