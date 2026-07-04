import { rmSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { confirmQuestion } from "../ui/prompts.js";
import { showSummaryBox } from "../ui/display.js";
import { info, success, warning } from "../ui/colors.js";

const CONFIG_DIR = join(homedir(), ".config", "knowledge-manager");

export async function resetCommand(force = false): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    console.log(warning("No hay instalación de Knowledge Manager que resetear."));
    return;
  }

  if (!force) {
    const ok = await confirmQuestion(
      `¿Eliminar toda la configuración y base de datos en ${CONFIG_DIR}?`,
      false
    );
    if (!ok) {
      console.log(info("Cancelado."));
      return;
    }
  }

  const dbPath = join(CONFIG_DIR, "skills.db");
  const configPath = join(CONFIG_DIR, "config.json");

  if (existsSync(dbPath)) rmSync(dbPath);
  if (existsSync(configPath)) rmSync(configPath);

  const remaining = existsSync(CONFIG_DIR) ? rmSync(CONFIG_DIR, { recursive: true }) : null;

  showSummaryBox("Reset completado", [
    success("Configuración eliminada."),
    info("Ejecutá 'knowledge-manager init' para configurar de nuevo."),
  ]);
}
