# UI Patterns

## Stack

| Librería | Propósito |
|----------|-----------|
| `commander` | CLI args parsing |
| `chalk` | Colores en terminal |
| `ora` | Spinners para operaciones async |
| `inquirer` | Prompts interactivos (input, checkbox, confirm, list) |
| `boxen` | Cards/bordes para mensajes importantes |
| `cli-table3` | Tablas para listar skills |

## Conventiones de Código

Siempre wrappear las librerías en `src/ui/` para no depender directamente:

```
src/ui/
├── spinner.ts    # ora wrapper
├── colors.ts     # chalk wrapper
├── prompts.ts    # inquirer wrapper
└── display.ts    # boxen + cli-table3
```

## Paleta de Colores

| Estado | Chalk | Símbolo |
|--------|-------|---------|
| Éxito | `chalk.green` | ✔ |
| Error | `chalk.red` | ✖ |
| Warning | `chalk.yellow` | ⚠ |
| Info | `chalk.blue` | ℹ |
| Progress | `chalk.cyan` | ◌ |
| Match FTS5 | `chalk.magenta` | ★ |

## Prompt Patterns

### Setup Wizard
```typescript
// init.ts
const { repoPath } = await prompts.input({
  message: '¿Dónde está tu repositorio de skills?'
})

const { aiClient } = await prompts.select({
  message: '¿Qué AI client usás?',
  choices: [
    { name: 'Claude', value: 'claude', description: '→ .claude/skills/' },
    { name: 'Gemini CLI', value: 'gemini-cli', disabled: true },
    { name: 'Codex CLI', value: 'codex-cli', disabled: true }
  ]
})
```

### Search + Install
```typescript
// search.ts
const { query } = await prompts.input({ message: 'Buscar skills:' })
const results = registry.searchFTS(query)

const { selected } = await prompts.checkbox({
  message: 'Seleccioná los skills a instalar:',
  choices: results.map(s => ({
    name: `${s.category}/${s.name}`,
    value: s.id,
    checked: false
  }))
})
```

### Confirm + Spinner
```typescript
// install.ts
const spinner = ora('Instalando...').start()
// ... do work
spinner.succeed(`✔ ${skill.name} instalado`)
```

## Reglas de UX

1. **Siempre mostrar feedback**: cada operación tiene spinner + resultado
2. **Siempre confirmar antes de escribir**: no hay overwrite silencioso
3. **Dry-run mode**: `--dry-run` muestra qué pasaría sin ejecutar
4. **Idempotente**: correrlo N veces da el mismo resultado
5. **Wizard no config**: el tool guía, el usuario no necesita leer docs para el primer uso
