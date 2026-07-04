# 05 — Estructura del Repositorio de Skills

## Estructura del Repositorio de Skills

```
repositorio-skills/
├── skill-manifest.json              # Metadata global del repositorio
├── android/
│   └── base-android/
│       ├── SKILL.md                 # YAML frontmatter + documentación
│       ├── templates/
│       │   └── build.gradle.kts     # Archivos que se copian al proyecto
│       └── scripts/
│           └── setup-android.sh
├── react/
│   └── base-react/
│       ├── SKILL.md
│       ├── templates/
│       └── ...
├── testing/
│   └── vitest-config/
│       ├── SKILL.md
│       └── vitest.config.ts
└── ...
```

## Manifest del Repositorio

```json
{
  "version": "1.0.0",
  "name": "mis-skills",
  "description": "Skills para desarrollo Android y web",
  "author": "Tu Nombre",
  "updated_at": "2026-06-24T00:00:00Z"
}
```

## SKILL.md con YAML Frontmatter (única fuente de metadata)

Cada skill tiene un `SKILL.md` que comienza con YAML frontmatter. Este frontmatter es la **única fuente de verdad** para la metadata — la herramienta lo parsea con `gray-matter` y lo indexa en FTS5.

```markdown
---
name: base-android
version: 1.2.0
category: android
description: "Configuración base para proyectos Android con Kotlin"
tags:
  - android
  - kotlin
  - gradle
  - base
priority: 10
author: "Javier Solis Flores"
license: MIT
ai_clients:
  - claude
  - gemini-cli
detect:
  frameworks: ["android"]
  files: ["build.gradle.kts", "build.gradle"]
dependencies: []
conflicts: []
updated_at: "2026-06-24"
---

# Base Android

Skills y patrones base para proyectos Android con Kotlin.

## Incluye
- Estructura de carpetas recomendada
- Configuración de Gradle
- Patrones de navegación

## Uso
Este skill agrega la configuración base para arrancar un proyecto Android.
```

## Campos del Frontmatter para DB y Búsqueda

| Campo | Tipo | Propósito | Indexado FTS5 |
|-------|------|-----------|---------------|
| `name` | string | Identificador único del skill | ✅ |
| `version` | string | Control de versiones (semver) | ❌ (exact match) |
| `category` | string | Agrupación: android, react, testing | ✅ |
| `description` | string | Texto descriptivo | ✅ |
| `tags` | string[] | Tags para búsqueda y filtrado | ✅ |
| `priority` | number | Orden en sugerencias (mayor = más arriba) | ❌ |
| `author` | string | Creador del skill | ✅ |
| `license` | string | Licencia del skill | ❌ |
| `ai_clients` | string[] | Clientes compatibles (vacío = todos) | ✅ |
| `detect` | object | Reglas de detección de stack (fase 3) | ❌ |
| `dependencies` | string[] | Skills requeridos (se instalan antes) | ❌ |
| `conflicts` | string[] | Skills incompatibles | ❌ |
| `updated_at` | date | Fecha de última modificación | ❌ |

### Cómo se genera el tags para FTS5

El scanner **concatena** `name + category + description + tags` en el campo `tags` de la virtual table FTS5. Esto permite búsquedas cross-campo.

```
Input: "android base"
Match: name="base-android" + category="android" + tags=["android", "base"]
→ Resultado rankeado por BM25
```

## Cómo agregar una skill al repositorio

Para crear una skill nueva:

```
repositorio-skills/
└── <categoría>/
    └── <nombre-skill>/
        ├── SKILL.md       # Requerido — con YAML frontmatter
        ├── templates/     # Opcional — templates para copiar
        ├── scripts/       # Opcional — scripts de setup
        └── ...            # Cualquier otro archivo que se copiará
```

**Pasos**:
1. Crear carpeta `categoria/nombre-skill/`
2. Crear `SKILL.md` con YAML frontmatter (ver ejemplo arriba)
3. Agregar archivos que se copiarán al proyecto (templates, scripts, configs)
4. Ejecutar `skill-manager rescan` para re-indexar

> **Validación**: si falta `name` en el frontmatter, se usa el nombre de la carpeta.
> Si falta `category`, se usa el nombre de la carpeta padre.

## Repositorio de Ejemplo

El proyecto incluirá un **repo separado** `ejemplo-skills` con skills de muestra.

```
ejemplo-skills/
├── README.md                     # Explica qué es y cómo usarlo
├── package.json                  # Proyecto demo
├── .claude/
│   └── skills/                   # Vacío — aquí se instalarían los skills
└── catalog/skills/            # Repositorio de skills fuente
    ├── skill-manifest.json
    ├── android/
    │   └── base-android/
    │       ├── SKILL.md          # Con frontmatter completo
    │       └── templates/
    │           ├── build.gradle.kts
    │           └── AndroidManifest.xml
    ├── react/
    │   └── base-react/
    │       ├── SKILL.md
    │       └── templates/
    │           ├── tsconfig.json
    │           └── App.tsx
    └── testing/
        └── vitest-config/
            ├── SKILL.md
            └── vitest.config.ts
```

### Skill de ejemplo completo

**`catalog/skills/android/base-android/SKILL.md`**:

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
author: "Skill Manager"
license: MIT
ai_clients:
  - claude
detect:
  frameworks: ["android"]
  files: ["build.gradle.kts", "build.gradle"]
dependencies: []
conflicts: []
updated_at: "2026-06-24"
---

# Base Android

Configuración base para proyectos Android con Kotlin.

## Archivos incluidos
- `build.gradle.kts` — Configuración de Gradle con Kotlin DSL
- `AndroidManifest.xml` — Manifest básico
```

**`catalog/skills/android/base-android/templates/build.gradle.kts`**:

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.example.app"
    compileSdk = 34
    // ...
}
```

## Instalación: Ruta según AI Client

Cuando el usuario elige un AI Client, los archivos se copian a la ruta correspondiente:

| AI Client | Local (proyecto) | Global |
|-----------|-----------------|--------|
| Claude | `.claude/skills/<nombre-skill>/` | `~/.config/opencode/skills/<nombre-skill>/` |
| Gemini CLI | *(futuro)* | *(futuro)* |

> **Ejemplo**: skill `base-android` con Claude modo local → copia a:
> `.claude/skills/base-android/SKILL.md`
> `.claude/skills/base-android/templates/build.gradle.kts`

## Backup antes de update

Cuando se actualiza un skill existente, se crea un backup:

```
.claude/skills/.backups/
└── base-android/
    └── 2026-06-24T10-00-00/
        ├── SKILL.md
        └── templates/
            └── build.gradle.kts
```
