# Skill Manager

CLI interactivo para instalar **AI agent skills** desde un repositorio local hacia tu proyecto.

Inspirado en [autoskills](https://github.com/midudev/autoskills) pero con un modelo distinto: el repositorio de skills es una carpeta local (no un registry centralizado), y la herramienta cachea los skills en una base SQLite + FTS5 para búsqueda y selección rápida.

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js >= 22 |
| Lenguaje | TypeScript 5.x |
| CLI | TUI propia (raw mode) + commander + chalk |
| DB | SQLite + FTS5 (sql.js) |
| Frontmatter | gray-matter |
| Build | tsup |
| Tests | vitest |

## Instalación

```bash
npx skill-manager init
```

## Uso rápido

```bash
# Iniciar configuración (escanea el repo y crea la DB)
npx skill-manager init

# Buscar e instalar skills interactivamente
npx skill-manager search

# Instalar skills por ID
npx skill-manager install <id1> [id2...]

# Re-escanear el repositorio
npx skill-manager rescan

# Listar skills instalados
npx skill-manager list

# Actualizar skills instalados
npx skill-manager update

# Verificar integridad de skills instalados
npx skill-manager verify

# Reparar skills corruptos
npx skill-manager repair

# Resetear toda la configuración
npx skill-manager reset
```

## Búsqueda interactiva

El comando `search` abre un TUI con:
- Búsqueda FTS5 por nombre, categoría, tags y descripción
- Lista con checkboxes y scroll automático (viewport dinámico)
- Análisis pre-instalación con comparación de hashes
- Instalación con feedback por skill

## Detección de duplicados

Los duplicados se detectan por **fingerprint de contenido** (hash compuesto de todos los archivos del skill), no por nombre o categoría. Skills con el mismo contenido en distintas ubicaciones se marcan como duplicados; skills con el mismo nombre pero distinto contenido no.

## Fases del proyecto

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Scaffolding + ejemplo-skills + docs | ✅ |
| 1 | MVP: scan + browse + install | ✅ |
| 2 | Update + no overwrite | ✅ |
| 3 | Instalación global | ✅ |
| 4 | Detección de stack + sugerencias | ✅ |
| 5 | Lock + verify + seguridad | ✅ |
| 6 | Publicación (npm + landing + CI/CD) | 🔜 |
| 7 | Modo Cloud | 🔜 |

## Licencia

MIT
