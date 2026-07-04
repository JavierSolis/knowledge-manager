# ejemplo-skills

Repositorio de ejemplo para **Skill Manager**.

Skills de muestra para probar la herramienta sin tener que crear tu propio repositorio.

## Contenido

- `catalog/skills/` — Repositorio fuente con skills de ejemplo
- `.claude/skills/` — Destino de instalación (vacío)

## Skills incluidos

| Skill | Categoría | Descripción |
|-------|-----------|-------------|
| base-android | android | Configuración base Android con Kotlin |
| base-react | react | Configuración base React con TypeScript |
| vitest-config | testing | Configuración de Vitest para proyectos |

## Uso

```bash
npx skill-manager init
# Ingresar ruta: ./ejemplo-skills/catalog/skills
# Seleccionar AI client: Claude

npx skill-manager search
# Buscar: "android"
```

## Licencia

MIT
