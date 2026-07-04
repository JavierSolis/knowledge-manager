# Skill Manager — Plan de Implementación

## Visión General

CLI interactivo que permite instalar **AI agent skills** desde un repositorio local hacia un proyecto, similar en UX a [autoskills](https://github.com/midudev/autoskills) pero con un modelo distinto: el repositorio de skills es una carpeta local (no un registry centralizado), y la herramienta cachea los skills en una base SQLite + FTS5 para búsqueda y selección rápida.

Landing page, docs, y publicación npm para que cualquier usuario pueda `npx skill-manager`.

## Los 3 Elementos

```
┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│                     │     │                      │     │                      │
│   Proyecto destino  │◄────│   Skill Manager      │────►│   Repositorio skills │
│   (donde se         │     │   (herramienta CLI)  │     │   (carpeta local     │
│    instalan skills) │     │    + landing + docs   │     │    con skills)        │
│                     │     │                      │     │                      │
└─────────────────────┘     └──────────────────────┘     └──────────────────────┘

Además:                                    Además:
- ejemplo-skills/                          - skill-manifest.json
- .claude/skills/ (destino)                - categoria/nombre-skill/
                                           - SKILL.md (YAML frontmatter)
```

## Stack (como autoskills)

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js >= 22 |
| Lenguaje | TypeScript 5.x |
| CLI | commander + chalk + ora + inquirer |
| DB | SQLite + **FTS5** (approach Engram) |
| Frontmatter | gray-matter (parseo YAML) |
| Build | tsup |
| Tests | vitest |
| Landing | Astro / vanilla HTML |

## Principios de Diseño

1. **Cachear todo**: No re-escanear el repo de skills a menos que haya cambios
2. **UX ante todo**: Spinners, colores, prompts interactivos, feedback claro
3. **Seguridad**: SHA-256 de skills, lock file de lo instalado
4. **Búsqueda FTS5**: Indexación full-text al estilo Engram, no LIKE
5. **Multi AI Client**: Soporte para Claude, Gemini CLI, etc. desde el vamos
6. **Nunca chancar sin preguntar**: Update con confirmación + backup automático
7. **Tests por feature**: Cada fase incluye tests antes de avanzar
8. **Offline-first**: Sin cloud dependencies para el core flow
9. **Incremental**: Fases bien definidas, MVP funcional primero

## Documentos del Plan

| Documento | Contenido |
|-----------|-----------|
| `index.md` | Visión general, principios, mapa de docs |
| `01-analisis.md` | Análisis autoskills + requerimientos + flujo completo |
| `02-arquitectura.md` | Componentes, módulos, flujo de datos |
| `03-flujo-ux.md` | User journey, pantallas, update flow, no-overwrite |
| `04-disenio-bd.md` | Schema SQLite + FTS5, queries, ai_clients table |
| `05-estructura-skills.md` | Repo de skills, YAML frontmatter, ejemplo completo |
| `06-fases.md` | 8 fases: 0→7 con features, dependencias y tests |
| `07-dependencias.md` | Stack detallado, librerías, estructura de archivos |
| `08-publicacion.md` | npm publish, landing page, GitHub Star + Sponsor |
| `09-como-agregar-skill.md` | Guía para crear skills (frontmatter, tags, estructura) |
