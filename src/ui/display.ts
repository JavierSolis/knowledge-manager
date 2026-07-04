import boxen from "boxen";
import Table from "cli-table3";
import { success, error as err, warning, info, highlight, dim, successBold, cyan, bold } from "./colors.js";
import type { SearchResult, InstalledSkill } from "../types/skill.js";

export function showHero(version: string = "1.0.0"): void {
  console.log(
    boxen(
      `${bold("KNOWLEDGE MANAGER")} ${dim(`v${version}`)}\n${dim("Instalá AI skills desde tu repositorio local")}`,
      {
        padding: { top: 0, bottom: 0, left: 2, right: 2 },
        margin: 0,
        borderColor: "cyan",
        borderStyle: "double",
        textAlignment: "center",
      }
    )
  );
}

export interface SkillAnalysis {
  id: number;
  name: string;
  category: string;
  description: string;
  status: "nueva" | "idéntica" | "diferente";
  files: number;
}

export interface DestAnalysis {
  destinationPath: string;
  parentExists: boolean;
  skills: SkillAnalysis[];
}

export function showWelcomeBox(): void {
  const message = [
    highlight("Bienvenido a Knowledge Manager!"),
    "",
    "Esta herramienta instala AI skills",
    "desde tu repositorio local de skills.",
  ].join("\n");

  console.log(
    boxen(message, {
      padding: 1,
      margin: 1,
      borderColor: "blue",
      borderStyle: "round",
    })
  );
}

export function showSummaryBox(
  title: string,
  lines: string[],
  borderColor: "green" | "red" | "yellow" | "blue" = "green"
): void {
  console.log(
    boxen(lines.join("\n"), {
      padding: 1,
      margin: 1,
      borderColor,
      borderStyle: "round",
    })
  );
}

export function showPreInstallBox(analysis: DestAnalysis): void {
  console.log("");
  console.log(cyan("   ◆ ") + bold("Pre-instalación"));
  console.log("");
  console.log(`     ${bold("Destino:")} ${analysis.destinationPath}`);
  console.log("");

  for (const skill of analysis.skills) {
    if (skill.status === "nueva") {
      console.log(`     • ${skill.category}/${skill.name}    ${success("(nueva)")}`);
    } else if (skill.status === "idéntica") {
      console.log(`     • ${skill.category}/${skill.name}    ${info("(ya instalada, sin cambios)")}`);
    } else {
      console.log(`     • ${skill.category}/${skill.name}    ${warning("(se sobrescribirá — hash distinto)")}`);
    }
  }

  if (!analysis.parentExists) {
    console.log("");
    console.log(`     ${warning("La carpeta destino no existe, se creará al instalar")}`);
  }
  console.log("");
}

export function showDoneBox(
  results: { skillName: string; success: boolean; filesCopied: number; error?: string }[],
  mode: string,
  path: string,
): void {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log("");
  console.log(cyan("   ◆ ") + bold("Instalación completada"));
  console.log("");
  console.log(`     ${successful.length} skills instalados en modo ${mode}`);
  console.log(`     Destino: ${path}`);
  console.log("");
  for (const r of successful) {
    console.log(`       ✓ ${r.skillName} (${r.filesCopied} archivos)`);
  }
  for (const r of failed) {
    console.log(`       ✖ ${r.skillName}: ${r.error}`);
  }
  console.log("");
}

export function showSearchResults(results: SearchResult[]): void {
  if (results.length === 0) {
    console.log(info("No se encontraron resultados."));
    return;
  }

  const table = new Table({
    head: ["Skill", "Categoría", "Relevancia"],
    colWidths: [30, 15, 10],
  });

  for (const r of results) {
    const stars = r.rank > 0 ? "★".repeat(Math.min(Math.ceil(r.rank), 5)) : "";
    table.push([`${r.category}/${r.name}`, r.category, stars]);
  }

  console.log(table.toString());
}

export function showInstalledList(installed: InstalledSkill[]): void {
  if (installed.length === 0) {
    console.log(info("No hay skills instalados."));
    return;
  }

  const table = new Table({
    head: ["Skill", "Modo", "AI Client", "Instalado"],
    colWidths: [30, 10, 15, 20],
  });

  for (const i of installed) {
    table.push([
      `${i.skill_category || "?"}/${i.skill_name || "?"}`,
      i.mode,
      i.ai_client_name || "?",
      i.installed_at,
    ]);
  }

  console.log(table.toString());
}

export function showDryRunMessage(): void {
  console.log(warning("DRY-RUN: No se copiaron archivos"));
}

export function divider(): void {
  console.log("─".repeat(process.stdout.columns || 40));
}
