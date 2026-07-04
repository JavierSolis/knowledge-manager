# Instalación

## Requisitos

- Node.js >= 22
- npm o pnpm

## Desde npm (cuando esté publicado)

```bash
npx skill-manager init
```

## Desde el repositorio

```bash
git clone <repo-url>
cd skill-manager
npm install
npm run build
npm link
skill-manager init
```

## Primer uso

1. Ejecutar `skill-manager init`
2. Ingresar la ruta al repositorio de skills
3. Seleccionar el AI client (Claude, Gemini CLI, etc.)
4. La herramienta escanea y cachea los skills
5. Usar `skill-manager search` para buscar e instalar
