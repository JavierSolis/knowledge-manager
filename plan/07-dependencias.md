# 07 — Stack y Dependencias

## Stack Base

| Herramienta | Versión | Propósito |
|-------------|---------|-----------|
| Node.js | >= 22 | Runtime (como autoskills) |
| TypeScript | 5.x | Lenguaje |
| pnpm | 9.x | Package manager (o npm) |
| tsup | 8.x | Build (bundling para npx) |
| vitest | 2.x | Testing |

## Dependencias de Runtime

| Librería | Versión | Propósito | Alternativa |
|----------|---------|-----------|-------------|
| `commander` | ^12.x | CLI args parsing | yargs, clipanion |
| `chalk` | ^5.x | Colores en terminal | picocolors, kleur |
| `ora` | ^8.x | Spinners | nanospinner |
| `inquirer` | ^9.x | Prompts interactivos | @clack/prompts |
| `sql.js` | ^1.x | SQLite + FTS5 (pure JS) | better-sqlite3 |
| `gray-matter` | ^4.x | Parseo de YAML frontmatter | js-yaml manual |
| `boxen` | ^8.x | Cards/bordes en terminal | — |
| `cli-table3` | ^0.6 | Tablas en terminal | — |

> **sql.js** elegido sobre better-sqlite3 por zero native modules — distribuible via `npx` sin compilación.
> **gray-matter** para parsear el YAML frontmatter de SKILL.md.

## Dependencias de Desarrollo

| Librería | Propósito |
|----------|-----------|
| `@types/node` | Types para Node.js |
| `tsx` | Ejecución rápida en dev |
| `tsup` | Build para distribución |
| `vitest` | Testing unitario |
| `typescript` | Lenguaje |

## Landing Page

Para la landing (como autoskills), opciones:

| Opción | Pros | Contras |
|--------|------|---------|
| **Vanilla HTML + CSS** | Zero deps, simple, deploy rápido | Sin componentes |
| **Astro** | Como autoskills, liviano, Markdown | +1 dep |
| **Vite + simple** | Rápido, conocido | Sin SSR |
| **GitHub Pages + Jekyll** | Gratis, automático | Limitado |

> Recomendación: **Astro** (como autoskills) o **vanilla HTML** para simplicidad.

## package.json (borrador)

```json
{
  "name": "skill-manager",
  "version": "0.1.0",
  "description": "CLI para instalar AI skills desde un repositorio local",
  "type": "module",
  "bin": {
    "skill-manager": "./bin/skill-manager.js"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsup src/index.ts --format esm --outDir dist",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "inquirer": "^9.0.0",
    "sql.js": "^1.10.0",
    "gray-matter": "^4.0.3",
    "boxen": "^8.0.0",
    "cli-table3": "^0.6.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/inquirer": "^9.0.0",
    "@types/cli-table3": "^0.6.0",
    "@types/gray-matter": "^4.0.0",
    "tsx": "^4.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

## Estructura de Archivos Final

```
skill-manager/
├── bin/
│   └── skill-manager.js       # Entry point (shebang + require dist)
├── src/
│   ├── index.ts               # CLI bootstrap + commander
│   ├── commands/
│   │   ├── init.ts            # Setup inicial
│   │   ├── search.ts          # Búsqueda interactiva FTS5
│   │   ├── install.ts         # Instalación
│   │   ├── update.ts          # Update + backup
│   │   ├── list.ts            # Listar instalados
│   │   └── rescan.ts          # Re-escanear repo
│   ├── core/
│   │   ├── scanner.ts         # Escaneo de repo (parsea frontmatter)
│   │   ├── registry.ts        # Interfaz DB (SQLite + FTS5)
│   │   ├── installer.ts       # Copia de archivos + backup
│   │   ├── verifier.ts        # SHA-256 verification
│   │   ├── updater.ts         # Detección de cambios + update
│   │   └── detector.ts        # Tech stack detection (fase 4)
│   ├── db/
│   │   ├── connection.ts      # Conexión SQLite
│   │   └── migrations/
│   │       ├── 001-initial.sql
│   │       └── ...
│   ├── config/
│   │   └── manager.ts         # Config local (JSON)
│   ├── lock/
│   │   └── manager.ts         # skills-lock.json
│   ├── ui/
│   │   ├── spinner.ts         # Wrapper ora
│   │   ├── colors.ts          # Wrapper chalk
│   │   ├── prompts.ts         # Wrapper inquirer
│   │   └── display.ts         # Resúmenes, tablas, cards
│   └── types/
│       ├── skill.ts           # Skill + frontmatter interfaces
│       └── config.ts          # Config interfaces
├── tests/
│   ├── scanner.test.ts
│   ├── registry.test.ts
│   ├── installer.test.ts
│   ├── verifier.test.ts
│   ├── updater.test.ts
│   └── cli.test.ts
├── dist/
├── landing/                   # Landing page (Astro o vanilla)
├── docs/                      # Documentación
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── README.md
```
