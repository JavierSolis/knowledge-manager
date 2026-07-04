# 02 — Arquitectura

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────┐
│                     skill-manager                        │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │    CLI        │  │   Commands   │  │    Config    │   │
│  │  (commander)  │──│  (acciones)  │──│  (local)     │   │
│  └──────────────┘  └──────┬───────┘  └──────────────┘   │
│                           │                             │
│  ┌────────────────────────┼──────────────────────────┐  │
│  │                        │                          │  │
│  │  ┌─────────────────────┴──────────────────────┐   │  │
│  │  │              Core Engine                    │   │  │
│  │  │                                              │   │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │  │
│  │  │  │ Scanner  │  │ Registry │  │ Installer│   │   │  │
│  │  │  │ (scan)   │  │ (query)  │  │ (copy)   │   │   │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘   │   │  │
│  │  │                                              │   │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │  │
│  │  │  │ Verifier │  │ Detector│  │ Lockfile │   │   │  │
│  │  │  │ (hash)   │  │ (stack) │  │ (write)   │   │   │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘   │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐    │
│  │               DB Layer (SQLite)                   │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    │
│  │  │ Skills   │  │ Tags     │  │ Metadata │       │    │
│  │  │ Table    │  │ Table    │  │ Table    │       │    │
│  │  └──────────┘  └──────────┘  └──────────┘       │    │
│  └──────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Responsabilidades de cada Módulo

### CLI Layer (`src/index.ts`)
- Parseo de argumentos con commander
- Enrutamiento a comandos
- Manejo de flags (`--yes`, `--dry-run`, `--help`)

### Scanner (`src/scan.ts`)
- Recorre recursivamente el directorio de skills
- Identifica skills (carpetas con SKILL.md)
- Extrae metadata de cada skill
- Calcula SHA-256 de cada archivo
- Persiste en SQLite

### Registry / Query (`src/registry.ts`)
- Interfaz contra SQLite
- Búsqueda por nombre, categoría, tags
- Listado de skills disponibles
- Consulta de skills ya instalados

### Installer (`src/install.ts`)
- Copia archivos del repo de skills al proyecto destino
- Soporta modo local (`.claude/skills/`) y global (`~/.config/opencode/skills/`)
- Modo dry-run sin copiar
- Backup de skills existentes antes de overwrite

### Verifier (`src/verify.ts`)
- Calcula SHA-256 de archivos copiados
- Compara contra hash en DB
- Reporta inconsistencias

### Detector (`src/detect.ts`)
- Lee `package.json` del proyecto destino
- Sugiere categorías de skills relevantes
- (Fase 3, opcional)

### Lockfile (`src/lock.ts`)
- Lee/ escribe `skills-lock.json`
- Formato: skill_id → hash → ruta destino → timestamp

## Flujo de Datos

### Escaneo Inicial
```
Repo skills ──► Scanner ──► extrae metadata ──► SQLite
                │                                │
                └── calcula hash ────────────────┘
```

### Instalación
```
Usuario busca ──► Registry (SQLite) ──► lista skills
                                              │
Usuario selecciona ──► Installer ──► copia archivos
                                      │
                                      ▼
                              Verifier (SHA-256)
                                      │
                                      ▼
                              Lockfile (skills-lock.json)
```

## Directorio de Config Local

```
~/.config/skill-manager/
├── config.json        # Ruta al repo de skills, última versión escaneada
└── skills.db          # SQLite database (cache)
```

El proyecto destino recibe:
```
.proyecto/
├── skills-lock.json   # Lock de skills instalados
└── .claude/skills/    # Skills instalados (modo local)
```

O global:
```
~/.config/opencode/skills/  # Skills instalados globalmente
```
