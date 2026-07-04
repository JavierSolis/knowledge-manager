# Testing Patterns

## Stack

- **vitest** — framework de testing
- Config en `vitest.config.ts` en la raíz
- Tests en `tests/` mirrorando estructura de `src/`

## Qué testear por módulo

| Módulo | Tests |
|--------|-------|
| `scanner.ts` | ✅ parsea YAML frontmatter correctamente ✅ detecta skills en carpeta ✅ calcula SHA-256 ✅ maneja carpetas sin SKILL.md |
| `registry.ts` | ✅ inserta skill ✅ busca por FTS5 MATCH ✅ busca por categoría ✅ tags se indexan correctamente |
| `installer.ts` | ✅ copia archivos a ruta correcta ✅ respeta AI client path ✅ modo dry-run no escribe ✅ backup antes de update |
| `verifier.ts` | ✅ hash coincide ✅ hash no coincide reporta error |
| `updater.ts` | ✅ detecta cambio de versión ✅ detecta cambio de hash ✅ no update sin confirmar |
| `cli/index.ts` | ✅ --help muestra ayuda ✅ --version muestra versión ✅ flujo completo con mocks |

## Conventiones

```typescript
// tests/scanner.test.ts
import { describe, it, expect } from 'vitest'
import { scan } from '../src/core/scanner'

describe('scanner', () => {
  it('parses YAML frontmatter from SKILL.md', async () => {
    // ...
  })

  it('calculates SHA-256 for each file', async () => {
    // ...
  })
})
```

## Mocking

Para tests de integración del CLI, usar archivos temporales:

```typescript
import { mkdtempSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

function createTempRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'skill-test-'))
  // create fake skills...
  return dir
}
```

## Comandos

```bash
npm test          # vitest run
npm run test:watch  # vitest (watch mode)
```

## Reglas

1. **Cada feature tiene tests** — no se mergea sin tests
2. **No avanzar de fase** si los tests de la fase actual no pasan
3. **Tests primero** (TDD ideal, pero al menos same PR)
4. **Mockear filesystem** para tests de scanner/installer
5. **No mockear SQLite** — usar base temporal real (sql.js en memoria)
