import inquirer from "inquirer";
import { dim, cyan, green, yellow, bold } from "./colors.js";
import type { SearchResult } from "../types/skill.js";

export async function inputQuestion(
  message: string,
  options?: { default?: string; validate?: (input: string) => boolean | string }
): Promise<string> {
  const question: Record<string, unknown> = {
    type: "input",
    name: "result",
    message,
  };
  if (options?.default !== undefined) question.default = options.default;
  if (options?.validate !== undefined) question.validate = options.validate;

  const { result } = await inquirer.prompt([question]);
  return result;
}

function eraseOutput(lineCount: number): void {
  process.stdout.write(`\x1b[${lineCount}A\r\x1b[J`);
}

export async function searchCheckboxPrompt(
  results: SearchResult[],
): Promise<{ selected: number[]; action: "install" | "search" | "quit" }> {
  const selected = new Array(results.length).fill(true);
  let cursor = 0;
  let scrollOffset = 0;
  let lastRenderLines = 0;

  const HIDE = "\x1b[?25l";
  const SHOW = "\x1b[?25h";

  const categories = [...new Set(results.map((r) => r.category))];
  const showGroups = categories.length > 1;

  const termRows = process.stdout.rows || 24;
  const cols = process.stdout.columns || 80;

  function wrapText(text: string, maxWidth: number): string[] {
    if (!text) return [""];
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
    return lines.length > 0 ? lines.slice(0, 3) : [""];
  }

  function descWidth(): number {
    return Math.max(40, cols - 13);
  }

  function itemTotalLines(i: number): number {
    let lines = 1;
    lines += wrapText(results[i].description, descWidth()).length;
    if (showGroups && (i === 0 || results[i].category !== results[i - 1].category)) {
      lines += 1;
    }
    return lines;
  }

  function computeSlice(from: number, maxLines: number): { count: number; lines: number } {
    let lines = 0;
    let count = 0;
    for (let i = from; i < results.length; i++) {
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
      scrollOffset = Math.min(newOff, results.length - 1);
    }
  }

  function render(): void {
    if (lastRenderLines > 0) {
      process.stdout.write(`\x1b[${lastRenderLines}A\r\x1b[J`);
    }

    adjustScroll();

    const available = termRows - 4;
    const slice = computeSlice(scrollOffset, available);
    const visible = results.slice(scrollOffset, scrollOffset + slice.count);

    process.stdout.write(
      cyan("   ◆ ") + bold("Selecciona los skills a instalar:") + "\n\n",
    );

    let actualLines = 2;

    if (scrollOffset > 0) {
      process.stdout.write(`     ${dim("↑ más arriba")}\n`);
      actualLines++;
    }

    let lastCategory = "";
    for (let i = 0; i < visible.length; i++) {
      const absIdx = scrollOffset + i;
      const r = visible[i];
      if (showGroups && r.category !== lastCategory) {
        lastCategory = r.category;
        process.stdout.write(`   ${bold(yellow(r.category))}\n`);
      }
      const pointer = absIdx === cursor ? cyan("❯") : " ";
      const installed = r.installed;
      const check = selected[absIdx] ? green("◼") : (installed ? green("◻") : dim("◻"));
      const nameMax = Math.max(20, cols - 17);
      const label = r.name.length > nameMax ? r.name.substring(0, nameMax - 1) + "…" : r.name;
      const badge = installed ? ` ${green("✓ instalado")}` : "";
      process.stdout.write(
        `     ${pointer} ${check} ${installed ? green(label) : bold(label)}${badge}\n`,
      );
      const descLines = wrapText(r.description, descWidth());
      for (const line of descLines) {
        process.stdout.write(`           ${dim(line)}\n`);
      }
      actualLines += itemTotalLines(absIdx);
    }

    if (scrollOffset + slice.count < results.length) {
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
        bold("[s]") +
        dim(" buscar · ") +
        bold("[q]") +
        dim(" salir · ") +
        bold("[enter]") +
        dim(` confirm (${count}/${results.length})`) +
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
        eraseOutput(lastRenderLines);
        process.stdout.write(SHOW);

        const chosen = results
          .map((r, i) => ({ r, i }))
          .filter(({ i }) => selected[i])
          .map(({ r }) => r.id);

        if (chosen.length === 0) {
          resolve({ selected: [], action: "search" });
          return;
        }

        resolve({ selected: chosen, action: "install" });
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
        if (cursor < results.length - 1) {
          cursor++;
          render();
        }
        return;
      }

      if (key === "q") {
        settled = true;
        cleanup();
        eraseOutput(lastRenderLines);
        process.stdout.write(SHOW);
        resolve({ selected: [], action: "quit" });
        return;
      }
      if (key === "s") {
        settled = true;
        cleanup();
        eraseOutput(lastRenderLines);
        process.stdout.write(SHOW);
        resolve({ selected: [], action: "search" });
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

export async function simpleSelect<T>(
  message: string,
  items: { name: string; value: T }[],
): Promise<T | null> {
  if (items.length === 0) return null;

  let cursor = 0;

  const HIDE = "\x1b[?25l";
  const SHOW = "\x1b[?25h";

  function tuiHeight(): number {
    return 1 + 1 + items.length + 1 + 1;
  }

  let rendered = false;

  function render(): void {
    if (rendered) process.stdout.write(`\x1b[${tuiHeight()}A\r\x1b[J`);
    rendered = true;

    process.stdout.write(
      cyan("   ◆ ") + bold(message) + "\n\n",
    );

    for (let i = 0; i < items.length; i++) {
      const pointer = i === cursor ? cyan("❯") : " ";
      const radio = i === cursor ? green("⬤") : dim("○");
      process.stdout.write(
        `     ${pointer} ${radio} ${items[i].name}\n`,
      );
    }

    process.stdout.write("\n");
    process.stdout.write(
      dim("   ") +
        bold("[↑↓]") +
        dim(" move · ") +
        bold("[enter]") +
        dim(" confirm · ") +
        bold("[q]") +
        dim(" cancel") +
        "\n",
    );
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
        if (data === "\x1b[A") {
          cursor = (cursor - 1 + items.length) % items.length;
          render();
        } else if (data === "\x1b[B") {
          cursor = (cursor + 1) % items.length;
          render();
        }
        return;
      }

      for (const ch of data) {
        if (settled) return;

        if (ch === "\x03") {
          cleanup();
          process.stdout.write(SHOW + "\n");
          process.exit(0);
        }

        if (ch === "\r" || ch === "\n") {
          settled = true;
          cleanup();
          eraseOutput(tuiHeight());
          process.stdout.write(SHOW);
          resolve(items[cursor].value);
          return;
        }

        if (ch === "k") {
          cursor = (cursor - 1 + items.length) % items.length;
          render();
          return;
        }

        if (ch === "j") {
          cursor = (cursor + 1) % items.length;
          render();
          return;
        }

        if (ch === "q") {
          settled = true;
          cleanup();
          eraseOutput(tuiHeight());
          process.stdout.write(SHOW);
          resolve(null);
          return;
        }
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

export async function simpleConfirm(message: string): Promise<boolean> {
  const HIDE = "\x1b[?25l";
  const SHOW = "\x1b[?25h";

  function tuiHeight(): number {
    return 3;
  }

  function render(): void {
    process.stdout.write(
      cyan("   ◆ ") + bold(message) + "\n\n" +
      dim("   ") + bold("[enter]") + dim(" confirm · ") + bold("[q]") + dim(" cancel") + "\n",
    );
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

      if (data.startsWith("\x1b")) return;

      for (const ch of data) {
        if (settled) return;

        if (ch === "\x03") {
          cleanup();
          process.stdout.write(SHOW + "\n");
          process.exit(0);
        }

        if (ch === "\r" || ch === "\n") {
          settled = true;
          cleanup();
          eraseOutput(tuiHeight());
          process.stdout.write(SHOW);
          resolve(true);
          return;
        }

        if (ch === "q") {
          settled = true;
          cleanup();
          eraseOutput(tuiHeight());
          process.stdout.write(SHOW);
          resolve(false);
          return;
        }
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

export async function keySelect<T>(
  message: string,
  options: { key: string; label: string; value: T }[],
): Promise<T> {
  const HIDE = "\x1b[?25l";
  const SHOW = "\x1b[?25h";

  function tuiHeight(): number {
    return 3;
  }

  function render(): void {
    const footer = options
      .map((o) => dim(" ") + bold(`[${o.key}]`) + dim(` ${o.label}`))
      .join(" · ");
    process.stdout.write(
      cyan("   ◆ ") + bold(message) + "\n\n" +
      dim("   ") + footer + "\n",
    );
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

      if (data.startsWith("\x1b")) return;

      for (const ch of data) {
        if (settled) return;

        if (ch === "\x03") {
          cleanup();
          process.stdout.write(SHOW + "\n");
          process.exit(0);
        }

        for (const opt of options) {
          if (ch === opt.key) {
            settled = true;
            cleanup();
            eraseOutput(tuiHeight());
            process.stdout.write(SHOW);
            resolve(opt.value);
            return;
          }
        }
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

export async function actionListPrompt<T>(
  message: string,
  choices: { name: string; value: T }[]
): Promise<T> {
  const { result } = await inquirer.prompt([
    {
      type: "list",
      name: "result",
      message,
      choices,
    },
  ]);
  return result;
}

export async function selectQuestion<T>(
  message: string,
  choices: { name: string; value: T; description?: string }[]
): Promise<T> {
  const { result } = await inquirer.prompt([
    {
      type: "list",
      name: "result",
      message,
      choices,
    },
  ]);
  return result;
}

export async function checkboxQuestion<T>(
  message: string,
  choices: { name: string; value: T; checked?: boolean }[]
): Promise<T[]> {
  if (choices.length === 0) return [];

  console.log(`\n${message}\n`);
  choices.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name}`);
  });
  console.log("");

  const answer = await inputQuestion(
    "Números a seleccionar (separados por coma, ej: 1,3,5), o Enter para ninguno:"
  );

  if (!answer.trim()) return [];

  const indices = answer
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 1 && n <= choices.length);

  return indices.map((i) => choices[i - 1].value);
}

export async function confirmQuestion(
  message: string,
  defaultAnswer = true
): Promise<boolean> {
  const { result } = await inquirer.prompt([
    {
      type: "confirm",
      name: "result",
      message,
      default: defaultAnswer,
    },
  ]);
  return result;
}
