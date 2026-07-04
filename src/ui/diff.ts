import { readFileSync, existsSync } from "fs";
import { green, red, dim, bold, cyan } from "./colors.js";

interface DiffLine {
  type: "keep" | "add" | "remove";
  line: string;
}

function computeDiff(a: string[], b: string[]): DiffLine[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: "keep", line: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "add", line: b[j - 1] });
      j--;
    } else {
      result.unshift({ type: "remove", line: a[i - 1] });
      i--;
    }
  }
  return result;
}

const MAX_DIFF_LINES = 60;

export function showFileDiff(
  installedPath: string,
  sourcePath: string,
  skillName: string,
): void {
  if (!existsSync(installedPath) || !existsSync(sourcePath)) {
    console.log(`  ${dim(`(No se pudo leer el archivo fuente de ${skillName})`)}`);
    return;
  }

  const installed = readFileSync(installedPath, "utf-8");
  const source = readFileSync(sourcePath, "utf-8");

  if (installed === source) {
    console.log(`  ${dim("Los archivos SKILL.md son idénticos.")}`);
    return;
  }

  const diff = computeDiff(installed.split("\n"), source.split("\n"));

  const removed = diff.filter((d) => d.type === "remove").length;
  const added = diff.filter((d) => d.type === "add").length;

  console.log("");
  console.log(`  ${bold(cyan(`Diff — ${skillName}/SKILL.md`))}     ${dim(`-${removed} +${added}`)}`);
  console.log("");

  let shown = 0;
  let truncated = false;

  for (const d of diff) {
    if (d.type === "keep") continue;

    if (shown >= MAX_DIFF_LINES) {
      truncated = true;
      continue;
    }

    if (d.type === "remove") {
      console.log(`  ${red(`- ${d.line}`)}`);
    } else {
      console.log(`  ${green(`+ ${d.line}`)}`);
    }
    shown++;
  }

  if (truncated) {
    const remaining = (removed + added) - shown;
    console.log(`  ${dim(`... y ${remaining} líneas más`)}`);
  }
  console.log("");
}
