# Project Architecture

## Directory Structure

```
skill-manager/
├── src/
│   ├── index.ts               # CLI bootstrap + commander
│   ├── commands/              # Comandos del CLI (init, search, install, update, list, rescan)
│   ├── core/                  # Lógica principal (scanner, registry, installer, verifier, updater, detector)
│   ├── db/                    # SQLite connection + migrations
│   ├── config/                # Config local (~/.config/skill-manager/config.json)
│   ├── lock/                  # skills-lock.json read/write
│   ├── ui/                    # Wrappers de ora, chalk, inquirer, boxen
│   └── types/                 # Interfaces (Skill, Config, etc.)
├── tests/                     # Tests por módulo
├── docs/                      # Documentación de usuario
├── landing/                   # Landing page
├── plan/                      # Plan de implementación
└── .claude/                   # Project-level CLAUDE.md + skills
```

## Module Responsibilities

| Module | File | Responsibility |
|--------|------|---------------|
| CLI | `src/index.ts` | Parse args, route commands, flags |
| Scanner | `src/core/scanner.ts` | Walk repo, parse YAML frontmatter, calculate SHA-256 |
| Registry | `src/core/registry.ts` | SQLite + FTS5 interface (CRUD, search) |
| Installer | `src/core/installer.ts` | Copy files, create backups, resolve paths by AI client |
| Verifier | `src/core/verifier.ts` | SHA-256 check against lock |
| Updater | `src/core/updater.ts` | Detect changes by hash/version, prompt confirm |
| Detector | `src/core/detector.ts` | Read package.json, detect stack (Fase 4) |

## Data Flow

### Scan
```
Repo → Scanner → parse frontmatter → SQLite skills table → FTS5 index
```

### Install
```
User search → Registry (FTS5 MATCH) → checkbox select → Installer copy → Verifier (SHA-256) → Lock file
```

### Update
```
Installed lock vs Repo scan → diff by hash/version → prompt confirm → backup → copy → verify → lock
```

## Key Patterns

- **sql.js** is synchronous — queries are direct, no async/await needed for DB
- **gray-matter** parses YAML frontmatter from SKILL.md
- **FTS5 MATCH** for search with BM25 ranking
- AI client paths stored in `ai_clients` table, resolved by name
