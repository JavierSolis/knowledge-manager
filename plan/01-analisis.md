# 01 — Análisis Profundo

## Lo que tomamos de autoskills

### UX / CLI Flow
- `npx skill-manager` desde la raíz del proyecto
- Spinners con **ora** para operaciones async (escanear, instalar)
- Prompts interactivos con **inquirer** (checkbox lists, confirmaciones)
- Mensajes de color con **chalk** para feedback visual
- Flag `--dry-run` para preview sin instalar
- Flag `--yes` / `-y` para skip confirmaciones
- **Landing page** con instrucciones claras + GitHub Star + Sponsor buttons

### Arquitectura
- CLI thin wrapper que orquesta: detección → consulta → descarga/instalación
- Separación clara de responsabilidades (detect, registry, install, verify)
- Registry como fuente de verdad (nosotros: repositorio local + DB SQLite)

### Seguridad
- SHA-256 hashes en cada skill (verificación post-copia)
- Lock file (`skills-lock.json`) con source y hash instalado
- No instalar directo de upstream en runtime

### Publicación
- Publicado como paquete npm (`npx skill-manager`)
- Landing page en GitHub Pages / Vercel / Cloudflare Pages
- README.md + carpeta `docs/` con documentación completa

## Lo que cambiamos / es distinto

| Aspecto | autoskills | Skill Manager |
|---------|-----------|---------------|
| Origen de skills | Registry remoto curado | Repositorio LOCAL del usuario |
| Persistencia | Scan en runtime, sin DB | **SQLite cache** para no re-escanear |
| Búsqueda | N/A (auto-detect) | **FTS5** (full-text search como Engram) |
| Detección de stack | Automática (package.json) | **Manual** vía búsqueda + tags |
| Instalación | Descarga de URLs | **Copia** de archivos locales |
| Skills | Curadas por maintainers | **Propias del usuario** en su carpeta |
| AI Client | Solo Claude | **Multi-client**: Claude, Gemini CLI, etc. |
| Metadata skill | Solo SKILL.md | **YAML frontmatter** en SKILL.md + campos extra para DB |
| Update | No maneja | Detecta cambios por hash/version, **confirma antes de chancar** |
| Tests | No visible | **Tests por feature** (vitest) |
| Modo Cloud | No | Fase futura |

## Requerimientos Extraídos

### Funcionales (F)
- **F1**: CLI ejecutable via `npx skill-manager` o `skill-manager`
- **F2**: Setup inicial con ingreso de ruta al repositorio de skills
- **F3**: Selección de **AI Client** (Claude, Gemini CLI, etc.) — afecta ruta de instalación
- **F4**: Escaneo de carpeta de skills → construir DB SQLite local con **índice FTS5**
- **F5**: Skill = carpeta con `SKILL.md` (YAML frontmatter con metadatos) + archivos
- **F6**: Cada skill tiene metadatos en frontmatter: name, category, tags, version, hash, priority, author, ai_clients, detect, dependencies, conflicts
- **F7**: Búsqueda **FTS5** por nombre, categoría, tags, descripción
- **F8**: Listado interactivo con checkbox para seleccionar
- **F9**: Opción "todos" para instalar todo
- **F10**: Instalación LOCAL (`.claude/skills/`) vs GLOBAL (`~/.config/opencode/skills/`)
- **F11**: Ruta de instalación depende del AI Client seleccionado
- **F12**: Copia física de archivos al proyecto destino
- **F13**: Verificación SHA-256 post-instalación
- **F14**: Lock file de skills instalados (`skills-lock.json`)
- **F15**: Re-escanear solo si hubo cambios (versión del repo cambió)
- **F16**: **Update**: detectar skills desactualizados por hash/version, confirmar antes de overwrite
- **F17**: **No chancar** skills existentes sin confirmación explícita
- **F18**: Landing page con docs + GitHub Star + Sponsor

### Técnicos (T)
- **T1**: SQLite + FTS5 como cache local (approach Engram)
- **T2**: TypeScript + Node.js >= 22
- **T3**: Publicado como paquete npm
- **T4**: Lock file portable (commit-eable)
- **T5**: Modo dry-run
- **T6**: Detección de proyecto (lee package.json) para sugerir categorías
- **T7**: Tests con vitest para cada feature
- **T8**: Landing page con Astro (como autoskills) o vanilla HTML

### UX (U)
- **U1**: Prompt inicial tipo wizard
- **U2**: Spinners en operaciones largas
- **U3**: Colores semánticos (verde = ok, rojo = error, amarillo = warning)
- **U4**: Checklist con espacio, flechas, enter para confirmar
- **U5**: Feedback claro de qué se instaló y dónde
- **U6**: Confirmación antes de chancar skills existentes

## Mapa de AI Clients y Rutas

| AI Client | Ruta Local (proyecto) | Ruta Global |
|-----------|----------------------|-------------|
| Claude | `.claude/skills/` | `~/.config/opencode/skills/` |
| Gemini CLI | *(futuro)* | *(futuro)* |
| Codex CLI | *(futuro)* | *(futuro)* |

> **MVP**: solo Claude. La arquitectura soporta agregar más AI Clients via tabla `ai_clients` en DB.

## Flujo Completo del Usuario

```
1. npx skill-manager
   │
2. ¿Primera vez?
   ├── Sí → Wizard de setup:
   │        1. ¿Dónde está tu repositorio de skills?
   │        2. ¿Qué AI client usás? → [Claude (default)]
   │        → Escanea repo → Construye DB + FTS5 → Guarda config
   └── No → Carga DB existente
   │
3. Menú principal:
   ├── 🔍 Buscar skills (FTS5)
   ├── 📋 Ver skills instalados
   ├── 🔄 Re-escanear repositorio
   ├── ⬆️  Update skills (detecta cambios, confirma overwrite)
   ├── ⚙️  Configuración
   └── ❌ Salir
   │
4. [Buscar] → Ingresa query → Resultados rankeados FTS5 con checkbox
   │
5. Usuario selecciona skills → Enter
   │
6. ¿Global o Local?
   ├── Local → Copia a .claude/skills/ (según AI client)
   └── Global → Copia a ~/.config/opencode/skills/
   │
7. Verifica SHA-256 de cada skill copiado
   │
8. Escribe skills-lock.json
   │
9. Muestra resumen: ✅ skills instalados, hashes, rutas
```

## Estructura de Publicación

```
skill-manager/              # Repo principal (GitHub)
├── src/                    # CLI tool
├── landing/                # Landing page (Astro / vanilla)
├── docs/                   # Documentación
├── package.json
├── README.md
└── ...

ejemplo-skills/             # Repo separado de ejemplo
├── README.md
├── catalog/skills/         # Skills de ejemplo
│   └── ...
└── .claude/skills/         # Destino de instalación (vacío inicialmente)
```

## Estrategia de Tests

Cada feature tiene tests en `src/**/*.test.ts`:

| Área | Tests |
|------|-------|
| Scanner | Que detecta skills, parsea frontmatter, calcula hashes |
| Registry/DB | Que FTS5 indexa y busca correctamente |
| Installer | Que copia archivos, respeta rutas según AI client |
| Verifier | Que SHA-256 coincide |
| Updater | Que detecta cambios y no chanca sin confirmar |
| CLI | Integración: flujo completo con mocks |
