# STATUS — Skill Manager

> Backup de progreso del proyecto.
> Actualizado: 2026-06-24

## Fases Completadas

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Scaffolding + ejemplo-skills + docs | ✅ |
| 1 | MVP: scan + browse + install | ✅ |
| 2 | Update + no overwrite | ✅ |
| 3 | Instalación global | ✅ |
| 4 | Detección de stack + sugerencias | ✅ |
| 5 | Lock + verify + seguridad | ✅ |
| 6 | Publicación (npm + landing + CI/CD) | 🟡 En progreso |

## Implementación Actual

### Comandos (8 implementados)

| Comando | Status | Descripción |
|---------|--------|-------------|
| `init` | ✅ | Setup interactivo: repo path + AI client + scan + FTS5 index |
| `search` | ✅ | Búsqueda FTS5 con flags: `-i` (install after), `-y`, `--dry-run` |
| `install` | ✅ | Instala skills seleccionados al path del AI client |
| `list` | ✅ | Lista instalados, flag `-g` para global |
| `update` | ✅ | Detecta cambios por hash, pregunta antes de chancar, backup automático |
| `rescan` | ✅ | Re-escanéa repo y re-indexa sin perder config |
| `verify` | ✅ | SHA-256 de cada skill instalado vs lock file |
| `repair` | ✅ | Re-instala skills corruptos desde el repo |

**No implementados**: uninstall, info (nunca se crearon)

### Core modules

| Módulo | Archivo | Rol |
|--------|---------|-----|
| scanner | `src/core/scanner.ts` | Escanea skills del repo, lee SKILL.md + templates |
| registry | `src/core/registry.ts` | Metadata de skills + AI clients disponibles |
| installer | `src/core/installer.ts` | Copia archivos al destino + lock + post-install verify |
| updater | `src/core/updater.ts` | Detecta cambios, backup, update condicional |
| verifier | `src/core/verifier.ts` | SHA-256 hash computation + lock comparison |
| detector | `src/core/detector.ts` | Detecta stack del proyecto (React, Android, etc.) |
| config | `src/config/manager.ts` | Persistencia de config en `~/.config/skill-manager/config.json` |
| db | `src/db/connection.ts` | SQLite + FTS5 para search |
| ui | `src/ui/` | colors, prompts (inquirer), spinner (ora), display (boxen) |

### Tests

- **48 tests** — 8 suites, todos pasando
- **TypeScript**: 0 errores (`tsc --noEmit`)
- **Build**: exitoso (`npm run build` → tsup)

### Skills de ejemplo

`ejemplo-skills/catalog/skills/` contiene 3 skills:
- `react/base-react` — templates: tsconfig.json, App.tsx
- `android/base-android` — template: build.gradle.kts
- `testing/vitest-config` — template: vitest.config.ts

## Cómo probar localmente

```bash
# Build
npm run build

# Opción A: link global
npm link
skill-manager init

# Opción B: directo
node dist/index.js init
```

En `init` apuntar a `./ejemplo-skills` (ruta relativa desde donde corrés el comando).

## Archivos creados/modificados

| Archivo | Acción |
|---------|--------|
| `package.json` | v1.0.0, + repository, homepage, bugs, keywords |
| `src/index.ts` | version sync a 1.0.0 |
| `bin/skill-manager.js` | Apunta a dist/index.js |
| `README.md` | Tabla de fases actualizada, comandos verify/repair |
| `LICENSE` | MIT, 2026 Javier Solis |
| `.gitignore` | node_modules, dist, *.db, .env, .DS_Store |
| `STATUS.md` | Este archivo |
| `.github/workflows/ci.yml` | CI: test + typecheck + build |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Bug report template |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Feature request template |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR template |
| `landing/index.html` | Placeholders → JavierSolis |
| `landing/assets/logo.svg` | Logo SVG |
| `landing/_config.yml` | GitHub Pages config |

## Pendiente

- [ ] Probar E2E completo (init → search → install → list → verify)
- [ ] `npm login && npm publish --access public`
- [ ] Deploy landing (GitHub Pages / Vercel / Cloudflare)
- [ ] Crear demo.gif para landing/assets
- [ ] Inicializar git + remote (https://github.com/JavierSolis/skill-manager)
- [ ] Fase 7: Modo Cloud (ver plan/08-publicacion.md)

## Info del Proyecto

- **Username GitHub**: JavierSolis
- **Repo**: https://github.com/JavierSolis/skill-manager
- **Node**: >= 22
- **Stack**: TypeScript, commander, sql.js (FTS5), tsup, vitest
