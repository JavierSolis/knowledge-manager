# Plan Execution

## Cómo ejecutar el plan

El plan completo está en `plan/` con 10 documentos. Las fases están en `plan/06-fases.md`.

### Orden de fases (NO saltar)

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7
```

### Reglas por fase

1. **Leer** los docs relevantes de `plan/` antes de empezar la fase
2. **Implementar** cada feature listada en la fase
3. **Escribir tests** (vitest) para cada feature
4. **Correr tests**: `npm test` — deben pasar antes de pasar a la siguiente feature
5. **No avanzar** a la siguiente fase hasta que todos los tests de la actual pasen

### SDD con Sub-agentes

- Usar `task` o `delegate` para delegar implementación de features a sub-agentes
- Sub-agentes guardan resultados en Engram via `mem_save`
- El hilo principal solo pasa observation IDs, no el contenido completo
- Cada sub-agente recibe: fase + feature a implementar + referencia a los docs relevantes

### Fase 0: lo primero

```
1. npm init + tsconfig + tsup config + vitest config
2. Estructura src/ completa (archivos vacíos o stub)
3. Crear repo ejemplo-skills/ (separado o dentro del monorepo)
4. 3 skills de ejemplo con YAML frontmatter
5. README.md principal
6. docs/ folder con documentación base
7. landing/ (estructura mínima)
```

### Verificación

Siempre preguntar antes de chancar:
- `Existe ya?` → confirmar update
- `Tests pasan?` → recién ahí avanzar
- `Dry-run?` → `--dry-run` simula sin escribir
