# Cómo Agregar una Skill

## Estructura

Cada skill vive en `categoria/nombre-skill/` dentro del repositorio de skills:

```
repositorio-skills/
└── <categoría>/
    └── <nombre-de-la-skill>/
        ├── SKILL.md          ← Requerido: documentación + metadata
        ├── templates/        ← Opcional: archivos que se copian
        ├── scripts/          ← Opcional: scripts de setup
        └── otros-archivos    ← Se copian tal cual al proyecto
```

## El archivo SKILL.md

Debe comenzar con YAML frontmatter (entre `---`). Ahí vive toda la metadata que la herramienta indexa en FTS5 y usa para mapear en la DB.

```markdown
---
name: base-android
version: 1.0.0
category: android
description: "Configuración base para proyectos Android con Kotlin"
tags:
  - android
  - kotlin
  - gradle
  - base
priority: 10
author: "Tu Nombre"
license: MIT
ai_clients:
  - claude
detect:
  frameworks: ["android"]
  files: ["build.gradle.kts"]
dependencies: []
conflicts: []
updated_at: "2026-06-24"
---

# Acá va el contenido de la skill
```

## Campos Explicados

| Campo | Obligatorio | Ejemplo | Para qué sirve |
|-------|-------------|---------|----------------|
| `name` | ✅ | `base-android` | Identifica la skill. Se usa en la DB y en rutas de archivo |
| `version` | ✅ | `1.0.0` | Control de versiones (semver). Decide si hay update disponible |
| `category` | ✅ | `android` | Agrupación. También la carpeta padre |
| `description` | ✅ | `"Base Android"` | Se indexa en FTS5 para búsqueda |
| `tags` | ✅ | `[android, kotlin]` | Se indexan en FTS5. CLAVE para búsqueda semisemántica |
| `priority` | ❌ | `10` | Orden en resultados (mayor = más arriba) |
| `author` | ❌ | `"Tu Nombre"` | Atribución |
| `license` | ❌ | `MIT` | Licencia del contenido |
| `ai_clients` | ❌ | `[claude]` | Clientes compatibles. Vacío = todos |
| `detect` | ❌ | `frameworks: [android]` | Para auto-detección de stack (fase 4) |
| `dependencies` | ❌ | `[android/gradle-base]` | Skills que se instalan automáticamente antes |
| `conflicts` | ❌ | `[android/old-config]` | Skills incompatibles (no se pueden instalar juntos) |
| `updated_at` | ❌ | `2026-06-24` | Fecha de modificación |

## Tags y Búsqueda FTS5 (semisemántica)

Los tags son el mecanismo principal para que la búsqueda FTS5 encuentre tu skill:

```
tags:
  - android
  - kotlin
  - gradle
  - compose
  - jetpack
  - navigation
```

Cuando el usuario busca "android compose navigation", FTS5:
1. Tokeniza la query en palabras
2. Busca en name + category + description + tags
3. Rankea por BM25 (más matches = mejor resultado)

**Tips para buenos tags**:
- Incluí sinónimos (ej: "android" y "mobile")
- Incluí tecnologías relacionadas (ej: "kotlin", "gradle", "compose")
- No repitás el nombre de la categoría (se indexa automático)
- 3-8 tags es el sweet spot

## Archivos que se copian

Todo lo que no sea `SKILL.md` dentro de la carpeta del skill se copia al proyecto, manteniendo la estructura de carpetas:

```
base-android/
├── SKILL.md              ← NO se copia (es metadata)
├── .claude/
│   └── instructions.md   ← Se copia a .claude/instructions.md
└── templates/
    └── build.gradle.kts  ← Se copia a templates/build.gradle.kts
```

**Destino** (con Claude, modo local):
```
.proyecto/.claude/skills/base-android/.claude/instructions.md
.proyecto/.claude/skills/base-android/templates/build.gradle.kts
```

## Ejemplo completo

Mirá el repo `ejemplo-skills` que incluye 3 skills funcionales:
- `android/base-android` — Configuración Android
- `react/base-react` — Configuración React
- `testing/vitest-config` — Configuración Vitest
