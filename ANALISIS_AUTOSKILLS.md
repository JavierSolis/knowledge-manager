# Autoskills - Análisis para Proyecto Similar

## Qué es autoskills

CLI que escanea tu proyecto, detecta el tech stack, e instala "skills" de IA automáticamente desde un registry curado.

**Repo:** https://github.com/midudev/autoskills  
**Lenguaje principal:** Ruby (95.8%)  
**Stack del CLI:** Node.js >= 22

---

## Comando principal

```bash
npx autoskills
```

## Opciones del CLI

```
-y, --yes       Skip confirmation prompt
--dry-run       Show what would be installed without installing
-h, --help      Show help message
```

---

## Cómo funciona (flujo)

1. Ejecutás `npx autoskills` en la raíz de tu proyecto
2. Escanea `package.json`, archivos Gradle, configs para detectar tecnologías
3. Selecciona las mejores "AI agent skills" del registry curado
4. Descarga solo los archivos necesarios del registry y verifica antes de escribir

---

## Modelo de Seguridad

- NO instala directo de repos upstream en runtime
- Skills sincronizadas por maintainers a un registry local
- Escaneado contra prompt-injection y supply-chain risks
- SHA-256 hashes en manifest para verificación
- Escribe `skills-lock.json` con source y bundle hash instalado

---

## Tech Stack Soportado (ejemplos)

| Categoría | Tecnologías |
|-----------|-------------|
| Frameworks/UI | React, Next.js, Vue, Nuxt, Svelte, Angular, Astro, Tailwind, shadcn/ui |
| Lenguajes | TypeScript, Node.js, Go, Bun, Deno, Dart |
| Backend | Express, Hono, NestJS, Spring Boot |
| Mobile/Desktop | Expo, React Native, Flutter, SwiftUI, Tauri, Electron |
| Data | Supabase, Neon, Prisma, Drizzle ORM, Zod |
| Auth/Billing | Better Auth, Clerk, Stripe |
| Testing | Vitest, Playwright |
| Cloud | Vercel, Cloudflare, AWS, Azure, Terraform |
| Tooling | Turborepo, Vite, oxlint |

---

## Estructura del repo autoskills

```
autoskills/
├── packages/autoskills/   # CLI principal
├── src/                   # Web (Astro)
├── scripts/               # Scripts de sync/build
├── public/                # Assets estáticos
├── .githooks/
├── .github/
├── .opencode/command/
├── .vscode/
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

---

## Estructura base para tu proyecto

```
tu-cli/
├── src/
│   ├── index.ts        # Entry point, parsea args con commander
│   ├── detect.ts       # Detecta tech stack leyendo configs
│   ├── registry.ts     # Consulta registry de skills (JSON/manifest)
│   ├── install.ts      # Descarga e instala skills seleccionadas
│   └── verify.ts       # Verifica hashes SHA-256
├── registry/
│   └── skills.json     # Manifest de skills disponibles
├── package.json
├── tsconfig.json
└── README.md
```

---

## Dependencias clave (TypeScript/Node)

```json
{
  "commander": "^12.x",      // CLI args parsing
  "chalk": "^5.x",           // Colores en terminal
  "ora": "^8.x",             // Spinners
  "inquirer": "^9.x",        // Prompts interactivos
  "node-fetch": "^3.x",      // HTTP requests
  "crypto": "builtin"        // SHA-256 verification
}
```

---

## Lógica de detección (ejemplo simplificado)

```typescript
// detect.ts
import { readFileSync } from 'fs'

interface DetectedStack {
  name: string
  version?: string
}

function detectStack(projectPath: string): DetectedStack[] {
  const stack: DetectedStack[] = []
  
  // Leer package.json
  try {
    const pkg = JSON.parse(readFileSync(`${projectPath}/package.json`, 'utf-8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    
    if (deps['react']) stack.push({ name: 'react' })
    if (deps['next']) stack.push({ name: 'nextjs' })
    if (deps['vue']) stack.push({ name: 'vue' })
    if (deps['typescript']) stack.push({ name: 'typescript' })
    if (deps['vitest']) stack.push({ name: 'vitest' })
    // ... más detecciones
  } catch {}
  
  // Leer configs adicionales
  // tsconfig.json, vite.config.ts, etc.
  
  return stack
}
```

---

## Estructura del registry (skills.json)

```json
{
  "skills": [
    {
      "id": "react-testing",
      "name": "React Testing Patterns",
      "description": "Best practices for React component testing",
      "detect": ["react", "vitest"],
      "files": [
        {
          "path": ".claude/skills/react-testing/SKILL.md",
          "hash": "sha256:abc123...",
          "url": "https://registry.autoskills.sh/skills/react-testing/SKILL.md"
        }
      ],
      "priority": 10
    }
  ]
}
```

---

## Comandos de setup rápido

```bash
# Crear proyecto
mkdir tu-cli && cd tu-cli
npm init -y
npm install commander chalk ora inquirer
npm install -D typescript @types/node tsx

# tsconfig.json básico
npx tsc --init --target ES2022 --module NodeNext --outDir dist

# Estructura
mkdir src registry
touch src/index.ts src/detect.ts src/registry.ts src/install.ts src/verify.ts
```

---

## Referencias

- **autoskills repo:** https://github.com/midudev/autoskills
- **commander.js docs:** https://www.npmjs.com/package/commander
- **chalk docs:** https://www.npmjs.com/package/chalk
- **ora docs:** https://www.npmjs.com/package/ora
