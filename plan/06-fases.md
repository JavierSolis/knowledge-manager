# 06 — Fases de Implementación

## Fase 0: Scaffolding + Repo de Ejemplo + Docs

**Objetivo**: Base del proyecto, repo de ejemplo con skills, README, docs.

| # | Feature | Descripción | Tests |
|---|---------|-------------|-------|
| 0.1 | Crear proyecto npm/TypeScript | package.json, tsconfig, tsup, estructura `src/` | — |
| 0.2 | Crear repo `ejemplo-skills` | Repo separado con `catalog/skills/`, `.claude/skills/`, README | — |
| 0.3 | Skills de ejemplo | 3 skills: `android/base-android`, `react/base-react`, `testing/vitest-config` | — |
| 0.4 | README.md principal | Instalación, uso rápido, ejemplos | — |
| 0.5 | Carpeta `docs/` | Documentación de referencia (ver secciones abajo) | — |
| 0.6 | Landing page | Astro o vanilla HTML + CSS, GitHub Star + Sponsor buttons | — |

**Docs necesarios**:
```
docs/
├── instalar.md           # Cómo instalar y primer uso
├── como-agregar-skill.md # Guía para crear skills (frontmatter, estructura)
├── comandos.md           # Referencia de comandos CLI
├── ai-clients.md         # Soporte de AI clients y rutas
└── ejemplo.md            # Tutorial con el repo ejemplo-skills
```

---

## Fase 1: MVP — Scan + Browse + Install (Core Loop)

**Objetivo**: Ciclo completo funcional: configurar repo → elegir AI client → escanear → buscar FTS5 → instalar.

| # | Feature | Descripción | Tests |
|---|---------|-------------|-------|
| 1.1 | CLI bootstrap + comandos base | `commander`, flags `--help`, `--version` | ✓ |
| 1.2 | Wizard de setup inicial | Prompt de ruta de repo + selección de AI Client | ✓ |
| 1.3 | Scanner de skills | Recorrer repo, parsear YAML frontmatter con `gray-matter`, calcular SHA-256 | ✓ |
| 1.4 | FTS5 Index | Crear virtual table, sincronizar con skills, triggers | ✓ |
| 1.5 | SQLite cache layer | CRUD de skills + tags + files + ai_clients | ✓ |
| 1.6 | Búsqueda FTS5 interactiva | Input → MATCH query → resultados rankeados → checkbox inquirer | ✓ |
| 1.7 | Instalador local (según AI client) | Copiar a `.claude/skills/`, verificar SHA-256, escribir lock | ✓ |
| 1.8 | Flags `--yes`, `--dry-run` | Skip confirmaciones, simular sin copiar | ✓ |
| 1.9 | UX: spinners + colores + resumen | ora, chalk, boxen en todas las operaciones | — |

**MVP entregable**: `npx skill-manager` → setup (ruta + AI client) → buscar (FTS5) → instalar.

---

## Fase 2: Update + No Overwrite

**Objetivo**: Detectar skills desactualizados y actualizar sin chancar sin confirmar.

| # | Feature | Descripción | Tests |
|---|---------|-------------|-------|
| 2.1 | Detector de cambios | Comparar hash/version instalado vs repo | ✓ |
| 2.2 | Lista de diferencias | Mostrar qué cambió por skill (archivos, versiones) | ✓ |
| 2.3 | Confirmación de update | Checkbox con skills a actualizar | ✓ |
| 2.4 | Backup automático | Copia de versión anterior a `.claude/skills/.backups/` | ✓ |
| 2.5 | Update installer | Reemplazar archivos, re-verificar, actualizar lock | ✓ |
| 2.6 | Comando `update` | Entrada en menú principal | ✓ |

---

## Fase 3: Instalación Global

**Objetivo**: Soporte para instalar skills globalmente.

| # | Feature | Descripción | Tests |
|---|---------|-------------|-------|
| 3.1 | Prompt modo local/global | inquirer choice list | ✓ |
| 3.2 | Instalador global | Copiar a `~/.config/opencode/skills/` (según AI client) | ✓ |
| 3.3 | Lock file unificado | skills-lock.json con modo + AI client + ruta | ✓ |
| 3.4 | Listar skills instalados | Query a installed + mostrar tabla | ✓ |

---

## Fase 4: Detección de Stack + Sugerencias Inteligentes

**Objetivo**: Auto-detectar tecnologías del proyecto y sugerir skills.

| # | Feature | Descripción | Tests |
|---|---------|-------------|-------|
| 4.1 | Detector de tech stack | Leer package.json, detectar frameworks | ✓ |
| 4.2 | Match detect → skills | Coincidir detect.frameworks del skill vs stack | ✓ |
| 4.3 | Sugerencia automática | Marcar por defecto skills que matchean | ✓ |
| 4.4 | Detección multi-stack | go.mod, requirements.txt, etc. | ✓ |

---

## Fase 5: Lock + Verify + Seguridad

**Objetivo**: Robustez y verificación de integridad.

| # | Feature | Descripción | Tests |
|---|---------|-------------|-------|
| 5.1 | skills-lock.json completo | skill_id, version, hash, ruta destino, timestamp | ✓ |
| 5.2 | Verificación post-instalación | Re-calcular SHA-256 vs lock, reportar diffs | ✓ |
| 5.3 | Re-escanear repo (update) | Detectar cambios por version/hash del repo | ✓ |
| 5.4 | Diff report | Skills nuevos/ modificados/ eliminados vs cache | ✓ |
| 5.5 | Modo repair | Re-instalar skills con hash incorrecto | ✓ |

---

## Fase 6: Publicación

**Objetivo**: Publicar la herramienta para que otros la usen.

| # | Feature | Descripción |
|---|---------|-------------|
| 6.1 | Publicar en npm | `npm publish`, configurar acceso |
| 6.2 | Landing page deploy | Vercel / Cloudflare Pages / GitHub Pages |
| 6.3 | GitHub repo público | README, issues, PR template, license |
| 6.4 | CI/CD | GitHub Actions: test + lint + publish |

---

## Fase 7: Modo Cloud (Futuro)

**Objetivo**: Sincronizar skills entre equipos/dispositivos.

| # | Feature |
|---|---------|
| 7.1 | Registry remoto (API REST) |
| 7.2 | Sync pull/push |
| 7.3 | Autenticación |
| 7.4 | Colaboración |

> **Fase 7 no se implementa ahora.** Solo documentada.

---

## Roadmap Temporal

```
Fase 0 (Base)       ██████░░░░░░░░░░░░░░░░  1 sesión
Fase 1 (MVP)        ████████████████░░░░░░  2-3 sesiones
Fase 2 (Update)     ██████░░░░░░░░░░░░░░░░  1 sesión
Fase 3 (Global)     ██████░░░░░░░░░░░░░░░░  1 sesión
Fase 4 (Detect)     ██████████░░░░░░░░░░░░  1-2 sesiones
Fase 5 (Lock)       ██████░░░░░░░░░░░░░░░░  1 sesión
Fase 6 (Publish)    ██████░░░░░░░░░░░░░░░░  1 sesión
Fase 7 (Cloud)      ░░░░░░░░░░░░░░░░░░░░░░  Futuro
```

**Regla**: Cada fase incluye sus tests. No se avanza a la siguiente sin tests pasando.
