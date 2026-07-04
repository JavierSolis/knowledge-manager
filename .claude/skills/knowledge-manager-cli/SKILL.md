---
name: knowledge-manager-cli
description: >
  Knowledge Manager CLI — scanner, search UI, and install flow conventions.
  Trigger: When working on knowledge-manager code, search UI, scanner, prompts, or install flow.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Modifying scanner logic (`src/core/scanner.ts`)
- Changing search/install UI (`src/ui/prompts.ts`, `src/commands/search.ts`)
- Changing init/rescan commands (`src/commands/init.ts`)
- Adding new interactive prompts or checkbox/radio selection

## Critical Patterns

### 1. Scanner: collection_skills directory

**REQUIRED**: `scanRepository()` must scan inside `<repoPath>/collection_skills/`, NOT from `repoPath` directly.

```typescript
// CORRECT:
const skillsDir = join(repoPath, "collection_skills");
return scanDirRecursive(skillsDir, skillsDir);

// WRONG:
return scanDirRecursive(repoPath, repoPath);
```

The structure is:
```
<repo>/
  collection_skills/
    <category>/
      <skill>/
        SKILL.md
        ...
```

The config stores the repo path (e.g. `/Users/user/Documents/proyectos/agents/`), and the scanner appends `collection_skills/` at scan time.

### 2. CLI Selection UI — autoskills-style TUI (✅ IMPLEMENTED in `src/ui/prompts.ts`)

Model after autoskills (midudev) custom raw-stdin TUI. **Do NOT use inquirer `checkbox`** for skill selection — use the custom `searchCheckboxPrompt()` which renders directly via `stdin.setRawMode()` + ANSI escape codes.

autoskills source reference: https://github.com/midudev/autoskills → `packages/autoskills/ui.ts`

#### Rendered output (exact)
```
   ◆ Seleccioná los skills a instalar:

   TypeScript
     ❯ ◼ typescript-advanced-types
             Advanced TypeScript patterns

   Node.js
       ◼ nodejs-backend-patterns
             Node.js backend best practices

   [↑↓] move · [space] toggle · [a] all · [enter] confirm (5/5)
```

#### Key patterns from autoskills
- **No inquirer**: raw `stdin.setRawMode(true)` + ANSI escape codes for cursor positioning
- **Items grouped by category**: category header in `bold(yellow)`, items indented below
- **Two-line items**: line 1 = `❯ ◼ skill-name` (bold), line 2 = `    description` (dim, 4+ spaces indent)
- **Checkbox**: `◼` (green, selected) / `◻` (dim, unselected)
- **Cursor**: `❯` (cyan) only on focused item; space prefix for unfocused
- **Footer help**: `[↑↓] move · [space] toggle · [a] all · [enter] confirm (N/M)` — always at bottom, NOT inline
- **Hide cursor**: `\x1b[?25l` during interaction, `\x1b[?25h` on exit
- **SIGINT**: clean exit with cursor restored
- **No external deps**: everything from Node.js built-ins (autoskills has 0 runtime dependencies)

#### Implementation checklist
```typescript
// src/ui/prompts.ts — searchCheckboxPrompt()

const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

function render(): void {
  // 1. Move cursor up and clear: `\x1b[{lineCount}A\r\x1b[J`
  // 2. Print header: `cyan("   ◆ ") + bold("...") + "\n\n"`
  // 3. Print each item, grouped by category
  //    - Category header: `bold(yellow(category))`
  //    - Focused: `cyan("❯")`, else `" "`
  //    - Selected: `green("◼")`, else `dim("◻")`
  //    - Name: `bold(name)`, Description: `dim(desc)` indented
  // 4. Footer help: `dim("   ") + bold("[↑↓]") + dim(" move · ") + ...`
}

#### ⚠️ Critical: raw stdin patterns (common bugs)

1. **NEVER iterate `data` character-by-character** in `onData()`:
   ```typescript
   // WRONG — escape sequences like \x1b[A get split, "A" triggers "a" (toggle all)
   for (const ch of data) { processKey(ch); }

   // CORRECT — check for escape sequences FIRST
   if (data.startsWith("\x1b")) { processKey(data); return; }
   for (const ch of data) { processKey(ch); }
   ```

2. **ALWAYS count EVERY rendered line** in `lineCount()`:
   - Header: 1
   - Blank after header: 1
   - Category headers: `categories.length` (if showGroups)
   - Items: `results.length * 2` (name line + desc line each)
   - Blank before footer: 1
   - Footer: 1
   
   If `lineCount()` is wrong, each re-render moves up the wrong amount and content duplicates.

3. **NEVER `\x1b[${n}A` on first render** — use a `rendered` flag:
   ```typescript
   let rendered = false;
   function render(): void {
     if (rendered) process.stdout.write(`\x1b[${lineCount()}A\r\x1b[J`);
     rendered = true;
     // ... draw
   }
   ```

4. **Siempre restaurar cursor** en SIGINT (`\x03`) y al resolver:
   ```typescript
   process.stdout.write(SHOW); // \x1b[?25h
   ```

5. **Siempre restaurar raw mode** en cleanup:
   ```typescript
   stdin.setRawMode(wasRaw ?? false);
   stdin.pause();
   ```

#### Key handlers:
// - \x03 (Ctrl+C): cleanup + exit
// - \r/\n (Enter): resolve with selected IDs
// - space: toggle current
// - "a": toggle all
// - "s": nueva búsqueda
// - "q": salir
// - \x1b[A / "k": cursor up
// - \x1b[B / "j": cursor down
```

#### Color palette (autoskills-inspired, via chalk)
- **Header icon**: `chalk.cyan`
- **Header text**: `chalk.bold`
- **Category header**: `chalk.bold.yellow`
- **Cursor**: `chalk.cyan("❯")`
- **Selected checkbox**: `chalk.green("◼")`
- **Unselected checkbox**: `chalk.dim("◻")`
- **Skill name (focused)**: `chalk.bold`
- **Description**: `chalk.dim`, indented
- **Footer help keys**: `chalk.bold`
- **Footer help text**: `chalk.dim`

### 3. Search Results Display (✅ REPLACED by custom TUI in `src/ui/prompts.ts:39`)

No longer uses inquirer `checkbox`. Now uses custom raw-stdin TUI (see section 2 above).

## Commands

```bash
# Typecheck after changes
npx tsc --noEmit

# Run tests
npx vitest run
```

## Resources

- **gentle-ai repo**: https://github.com/Gentleman-Programming/gentle-ai
  - `internal/tui/screens/common.go` — checkbox/radio rendering
  - `internal/tui/styles/styles.go` — style constants
- **Knowledge-manager source**:
  - `src/core/scanner.ts` — scanner logic (needs collection_skills fix)
  - `src/ui/prompts.ts` — interactive prompts (needs spacing fix)
  - `src/commands/search.ts` — search flow
  - `src/commands/init.ts` — init/rescan flow
