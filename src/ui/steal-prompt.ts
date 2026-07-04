import { dim, cyan, green, yellow, bold } from "./colors.js";

export interface StealCandidate {
  name: string;
  category: string;
  description: string;
  sourcePath: string;
  sourceFiles: number;
}

export async function stealCheckboxPrompt(
  candidates: StealCandidate[],
): Promise<{ selected: string[]; action: "extract" | "quit" }> {
  const selected = new Array(candidates.length).fill(true);
  let cursor = 0;
  let scrollOffset = 0;
  let lastRenderLines = 0;

  const HIDE = "\x1b[?25l";
  const SHOW = "\x1b[?25h";

  const categories = [...new Set(candidates.map((c) => c.category))];
  const showGroups = categories.length > 1;

  const termRows = process.stdout.rows || 24;
  const cols = process.stdout.columns || 80;

  function wrapText(text: string, maxWidth: number): string[] {
    if (!text) return [];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      if (test.length > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines.slice(0, 2) : [];
  }

  function descWidth(): number {
    return Math.max(40, cols - 13);
  }

  function itemTotalLines(i: number): number {
    let lines = 1;
    const desc = wrapText(candidates[i].description, descWidth());
    if (desc[0]) lines += desc.length;
    if (showGroups && (i === 0 || candidates[i].category !== candidates[i - 1].category)) {
      lines += 1;
    }
    return lines;
  }

  function computeSlice(from: number, maxLines: number): { count: number; lines: number } {
    let lines = 0;
    let count = 0;
    for (let i = from; i < candidates.length; i++) {
      const add = itemTotalLines(i);
      if (lines + add > maxLines) break;
      lines += add;
      count++;
    }
    return { count, lines };
  }

  function adjustScroll(): void {
    const available = termRows - 4;
    const slice = computeSlice(scrollOffset, available);

    if (cursor < scrollOffset) {
      scrollOffset = cursor;
    } else if (cursor >= scrollOffset + slice.count) {
      let newOff = cursor;
      while (newOff > 0) {
        const test = computeSlice(newOff, available);
        if (cursor < newOff + test.count) break;
        newOff--;
      }
      scrollOffset = Math.min(newOff, candidates.length - 1);
    }
  }

  function render(): void {
    if (lastRenderLines > 0) {
      process.stdout.write(`\x1b[${lastRenderLines}A\r\x1b[J`);
    }

    adjustScroll();

    const available = termRows - 4;
    const slice = computeSlice(scrollOffset, available);
    const visible = candidates.slice(scrollOffset, scrollOffset + slice.count);

    process.stdout.write(
      cyan("   ◆ ") + bold("Skills candidatos para extraer:") + "\n",
    );
    process.stdout.write(`     ${dim(`${candidates.length} skills fuera del repositorio`)}\n\n`);

    let actualLines = 3;

    if (scrollOffset > 0) {
      process.stdout.write(`     ${dim("↑ más arriba")}\n`);
      actualLines++;
    }

    for (let i = 0; i < visible.length; i++) {
      const absIdx = scrollOffset + i;
      const c = visible[i];
      if (showGroups && (absIdx === 0 || c.category !== candidates[absIdx - 1].category)) {
        process.stdout.write(`   ${bold(yellow(c.category))}\n`);
      }
      const pointer = absIdx === cursor ? cyan("❯") : " ";
      const check = selected[absIdx] ? green("◼") : dim("◻");
      const nameMax = Math.max(20, cols - 19);
      const label = c.name.length > nameMax ? c.name.substring(0, nameMax - 1) + "…" : c.name;
      process.stdout.write(
        `     ${pointer} ${check} ${bold(label)} ${dim(`(${c.sourceFiles} archivos)`)}\n`,
      );
      if (c.description) {
        const descLines = wrapText(c.description, descWidth());
        for (const line of descLines) {
          process.stdout.write(`           ${dim(line)}\n`);
        }
      }
      actualLines += itemTotalLines(absIdx);
    }

    if (scrollOffset + slice.count < candidates.length) {
      process.stdout.write(`     ${dim("↓ más abajo")}\n`);
      actualLines++;
    }

    process.stdout.write("\n");
    const count = selected.filter(Boolean).length;
    process.stdout.write(
      dim("   ") +
        bold("[↑↓]") +
        dim(" move · ") +
        bold("[space]") +
        dim(" toggle · ") +
        bold("[a]") +
        dim(" all · ") +
        bold("[enter]") +
        dim(` extraer (${count}/${candidates.length}) · `) +
        bold("[q]") +
        dim(" salir") +
        "\n",
    );
    actualLines += 2;

    lastRenderLines = actualLines;
  }

  return new Promise((resolve) => {
    process.stdout.write(HIDE);

    render();

    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf-8");

    let settled = false;

    function onData(data: string): void {
      if (settled) return;

      if (data.startsWith("\x1b")) {
        processKey(data);
        return;
      }

      for (const ch of data) {
        if (settled) return;
        processKey(ch);
      }
    }

    function processKey(key: string): void {
      if (key === "\x03") {
        cleanup();
        process.stdout.write(SHOW + "\n");
        process.exit(0);
      }

      if (key === "\r" || key === "\n") {
        settled = true;
        cleanup();
        process.stdout.write(`\x1b[${lastRenderLines}A\r\x1b[J`);
        process.stdout.write(SHOW);

        const chosen = candidates
          .map((c, i) => ({ c, i }))
          .filter(({ i }) => selected[i])
          .map(({ c }) => c.name);

        resolve({ selected: chosen, action: "extract" });
        return;
      }

      if (key === " ") {
        selected[cursor] = !selected[cursor];
        render();
        return;
      }

      if (key === "a") {
        const allSelected = selected.every(Boolean);
        selected.fill(!allSelected);
        render();
        return;
      }

      if (key === "\x1b[A" || key === "k") {
        if (cursor > 0) {
          cursor--;
          render();
        }
        return;
      }
      if (key === "\x1b[B" || key === "j") {
        if (cursor < candidates.length - 1) {
          cursor++;
          render();
        }
        return;
      }

      if (key === "q") {
        settled = true;
        cleanup();
        process.stdout.write(`\x1b[${lastRenderLines}A\r\x1b[J`);
        process.stdout.write(SHOW);
        resolve({ selected: [], action: "quit" });
        return;
      }
    }

    function cleanup(): void {
      stdin.setRawMode(wasRaw ?? false);
      stdin.pause();
      stdin.removeListener("data", onData);
    }

    stdin.on("data", onData);
  });
}
