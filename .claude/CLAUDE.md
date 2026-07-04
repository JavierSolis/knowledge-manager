# Knowledge Manager — Project Context

## Rol

Sos un **Senior Engineer** implementando un CLI tool en TypeScript/Node.js. Tenés autonomía total para tomar decisiones técnicas dentro del plan definido. Ejecutás las fases en orden, cada una con sus tests, y no avanzás sin tests pasando.

## Proyecto

CLI interactivo (`knowledge-manager`) que instala AI agent skills desde un repositorio local hacia un proyecto. Similar a autoskills (midudev) pero con repo local + SQLite FTS5 + multi AI client.

**Repo principal**: `/Users/javiersolisflores/Documents/proyectos/skill_manager/`
**Plan completo**: `plan/` (10 documentos)
**Repo de ejemplo**: `ejemplo-skills/` (Fase 0)

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js >= 22 |
| Lenguaje | TypeScript 5.x |
| CLI | commander + chalk + ora + inquirer |
| DB | SQLite + FTS5 (sql.js) |
| Frontmatter | gray-matter |
| Build | tsup |
| Tests | vitest |
| Landing | Astro o vanilla HTML |

## Decisiones de Arquitectura (no negociables)

1. **SQLite + FTS5** via sql.js — zero native modules, indexación full-text como Engram
2. **YAML frontmatter** en SKILL.md como única fuente de metadata (parseado con gray-matter)
3. **No chancar sin confirmar** — update requiere confirmación + backup
4. **AI Client** configurable — arrancamos con Claude, arquitectura preparada para más
5. **Tests primero** — cada fase incluye tests, no se avanza sin ellos
6. **Offline-first** — el core flow no necesita cloud

## Fases (orden estricto)

0. Scaffolding + ejemplo-skills + docs
1. MVP: scan + browse + install (core loop)
2. Update + no overwrite
3. Instalación global
4. Detección de stack + sugerencias
5. Lock + verify + seguridad
6. Publicación (npm + landing)
7. Cloud (futuro)

## Convenciones

- **Commits**: conventional commits (`feat:`, `fix:`, `chore:`, `test:`)
- **Sin atribución AI**: no agregar "Co-Authored-By"
- **Idioma**: código en inglés, docs/comentarios en español (es un proyecto personal argento)
- **Testing**: vitest, tests unitarios por módulo, tests de integración para CLI

## Skills del Proyecto

Los skills están en `.claude/skills/` y se cargan automáticamente según el contexto:

| Contexto | Skill |
|----------|-------|
| Scanner logic, search UI, prompts, install flow, init/rescan | `knowledge-manager-cli` |

## Links Rápidos

- `plan/index.md` — Visión general
- `plan/06-fases.md` — Fases detalladas con features y tests
- `plan/04-disenio-bd.md` — Schema SQLite + FTS5
- `plan/05-estructura-skills.md` — Formato de skills y ejemplo
- `plan/07-dependencias.md` — Dependencias y estructura de archivos
