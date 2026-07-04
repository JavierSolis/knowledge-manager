# Cómo agregar una skill

## Estructura de directorios

```
repositorio-skills/
└── <categoría>/
    └── <nombre-skill>/
        ├── SKILL.md       # Requerido — con YAML frontmatter
        ├── templates/     # Opcional — templates para copiar
        ├── scripts/       # Opcional — scripts de setup
        └── ...            # Cualquier otro archivo que se copiará
```

## SKILL.md con YAML Frontmatter

Cada skill tiene un `SKILL.md` que comienza con YAML frontmatter. Este frontmatter es la **única fuente de verdad** para la metadata.

```markdown
---
name: mi-skill
version: 1.0.0
category: web
description: "Descripción de la skill"
tags:
  - tag1
  - tag2
priority: 10
author: "Tu Nombre"
license: MIT
ai_clients:
  - claude
dependencies: []
conflicts: []
updated_at: "2026-06-24"
---

# Mi Skill

Descripción y documentación de la skill.
```

## Campos del Frontmatter

| Campo | Tipo | Requerido | Propósito |
|-------|------|-----------|-----------|
| `name` | string | ✅ | Identificador único del skill |
| `version` | string | ✅ | Control de versiones (semver) |
| `category` | string | ✅ | Agrupación: android, react, testing |
| `description` | string | ✅ | Texto descriptivo |
| `tags` | string[] | ✅ | Tags para búsqueda y filtrado |
| `priority` | number | ❌ | Orden en sugerencias |
| `author` | string | ❌ | Creador del skill |
| `license` | string | ❌ | Licencia |
| `ai_clients` | string[] | ❌ | Clientes compatibles (vacío = todos) |
| `dependencies` | string[] | ❌ | Skills requeridos |
| `conflicts` | string[] | ❌ | Skills incompatibles |
| `updated_at` | date | ❌ | Fecha de última modificación |

## Agregar al repositorio

```bash
repositorio-skills/
├── skill-manifest.json          # Metadata global del repositorio
└── web/
    └── mi-skill/
        ├── SKILL.md
        └── templates/
            └── ejemplo.txt
```
