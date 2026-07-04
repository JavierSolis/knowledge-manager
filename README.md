[🇪🇸 Español](#español) · [🇬🇧 English](#english)

---

# 🇪🇸 Español

# Skill Manager

CLI interactivo para instalar **AI agent skills** desde un repositorio local hacia tu proyecto.

Inspirado en [autoskills](https://github.com/midudev/autoskills) pero con un modelo distinto: el repositorio de skills es una carpeta local (no un registry centralizado), y la herramienta cachea los skills en una base SQLite + FTS5 para búsqueda y selección rápida.

## Quick Start

```bash
npx skill-manager
```

Un solo comando. Si es tu primera vez, configura el repositorio automáticamente y abre la búsqueda interactiva. Si ya lo usaste antes, va directo a buscar e instalar skills.

También podés usar el alias corto:

```bash
npx skm
```

## ¿Qué hace?

1. Escanea tu carpeta de skills local
2. Los indexa en SQLite con búsqueda FTS5
3. Abre un TUI interactivo para buscar y seleccionar
4. Instala los skills elegidos con verificación SHA-256

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js >= 22 |
| Lenguaje | TypeScript 5.x |
| CLI | Commander + TUI raw mode + chalk |
| DB | SQLite + FTS5 (sql.js) |
| Build | tsup |
| Tests | vitest |

## Referencia de comandos

```bash
npx skill-manager init          # Configurar repositorio y AI client
npx skill-manager search        # Buscar e instalar skills (TUI)
npx skill-manager install       # Igual que search (alias)
npx skill-manager list          # Listar skills instalados
npx skill-manager update        # Actualizar skills instalados
npx skill-manager rescan        # Re-escanear repositorio
npx skill-manager verify        # Verificar integridad
npx skill-manager repair        # Re-instalar skills corruptos
npx skill-manager conflict      # Detectar y resolver conflictos
npx skill-manager steal         # Extraer skills no registrados
npx skill-manager status        # Mostrar estado de instalación
npx skill-manager reset         # Resetear toda la configuración
npx skill-manager --help        # Ver todos los comandos
```

## Licencia

MIT

---

# 🇬🇧 English

# Skill Manager

Interactive CLI to install **AI agent skills** from a local repository into your project.

Inspired by [autoskills](https://github.com/midudev/autoskills) but with a different model: the skill repository is a local folder (not a centralized registry), and the tool caches skills in a SQLite + FTS5 database for fast search and selection.

## Quick Start

```bash
npx skill-manager
```

One command. First run auto-configures the repository and opens the interactive search. Subsequent runs go directly to searching and installing skills.

You can also use the short alias:

```bash
npx skm
```

## How it works

1. Scans your local skills folder
2. Indexes them in SQLite with FTS5 search
3. Opens an interactive TUI to browse and select
4. Installs selected skills with SHA-256 verification

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >= 22 |
| Language | TypeScript 5.x |
| CLI | Commander + TUI raw mode + chalk |
| DB | SQLite + FTS5 (sql.js) |
| Build | tsup |
| Tests | vitest |

## Command reference

```bash
npx skill-manager init          # Configure repo and AI client
npx skill-manager search        # Search and install skills (TUI)
npx skill-manager install       # Same as search (alias)
npx skill-manager list          # List installed skills
npx skill-manager update        # Update installed skills
npx skill-manager rescan        # Re-scan repository
npx skill-manager verify        # Verify integrity
npx skill-manager repair        # Re-install corrupted skills
npx skill-manager conflict      # Detect and resolve conflicts
npx skill-manager steal         # Extract unregistered skills
npx skill-manager status        # Show installation status
npx skill-manager reset         # Reset all configuration
npx skill-manager --help        # Show all commands
```

## License

MIT
