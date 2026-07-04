[🇪🇸 Español](#español) · [🇬🇧 English](README-en.md)

---

# Skill Manager

Herramientas como [autoskills](https://github.com/midudev/autoskills) usan un registry centralizado: no controlas versiones, no compartes skills con tu equipo, no tienes skills privadas. **Skill Manager** funciona como un gestor de paquetes para skills: tu repositorio Git es tu registry. Versionas, tu equipo alimenta el catálogo, y todos instalan desde ahí — sea un repo público, privado, o varios. Lo mismo que npm/pip pero con skills de IA.

## Prerrequisitos

Necesitas un repositorio de skills con la estructura válida. El repositorio puede ser cualquier carpeta local que contenga:

```
<mi-repo>/
├── catalog/
│   └── skill/
│       ├── mi-skill/
│       │   ├── SKILL.md
│       │   └── ...
│       └── otro-skill/
│           └── ...
```

La carpeta raíz (ej: `~/proyectos/mi-repo`) es tu "repositorio". Dentro de `catalog/skill/` van las skills, cada una en su propia subcarpeta.

> ⚠️ **Importante**: cuando la herramienta te pida la ruta del repositorio, ingresa la **raíz** (ej: `~/proyectos/mi-repo`), **no** la subcarpeta `catalog/skill/`.

Tienes un ejemplo funcional en [ejemplo-skills/](./ejemplo-skills) para ver la estructura y probar.

## Quick Start

```bash
npx skill-manager
```

Un solo comando. Si es tu primera vez, configura el repositorio automáticamente y abre la búsqueda interactiva. Si ya lo usaste antes, va directo a buscar e instalar skills.

También puedes usar el alias corto:

```bash
npx skm
```

## ¿Qué hace?

1. Escanea tu carpeta de skills local
2. Los indexa en SQLite con búsqueda FTS5
3. Abre un TUI interactivo para buscar y seleccionar
4. Instala los skills elegidos con verificación SHA-256

## Stack

| Capa     | Tecnología                       |
| -------- | -------------------------------- |
| Runtime  | Node.js >= 22                    |
| Lenguaje | TypeScript 5.x                   |
| CLI      | Commander + TUI raw mode + chalk |
| DB       | SQLite + FTS5 (sql.js)           |
| Build    | tsup                             |
| Tests    | vitest                           |

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

# Contact

<div align="center">
    
   <img src="docs/images/contact_img.png" width="90" align="center" alt="gato"/>

#### Javier Solis

👓 https://www.linkedin.com/in/android-developer-peru/

💼 https://www.behance.net/JavierJSolis

</div>
