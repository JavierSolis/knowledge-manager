# 03 — Flujo UX / UI

## Principios UX (tomados de autoskills)

1. **Wizard no config**: El tool guía al usuario paso a paso
2. **Feedback inmediato**: Spinner + mensaje de resultado en cada operación
3. **Confirmaciones**: Siempre preguntar antes de escribir archivos
4. **Zero friction**: Un comando, sin flags complejas (pero con flags para power users)
5. **Idempotencia**: Ejecutarlo N veces da el mismo resultado
6. **Nunca chancar sin preguntar**: Skills existentes no se overwritean sin confirmación

## User Journey

### 1. Primer uso (setup)

```
$ npx skill-manager

╭──────────────────────────────────────────╮
│  Bienvenido a Skill Manager!             │
│                                          │
│  Esta herramienta instala AI skills      │
│  desde tu repositorio local de skills.   │
╰──────────────────────────────────────────╯

? ¿Dónde está tu repositorio de skills?
  (ruta completa o relativa)
> ~/mis-skills/

? ¿Qué AI client usás?
  ● Claude  (instala en .claude/skills/)
  ○ Gemini CLI
  ○ Codex CLI
  ○ Otro

◌ Escaneando repositorio...
◌ Indexando búsqueda FTS5...
✔ Repositorio escaneado: 12 skills encontrados

? Seleccioná los skills que querés instalar (opcional):
  [ ] android/compose-testing
  [ ] android/jetpack-navigation
  [ ] react/react-testing
  [ ] typescript/basics
  [▼] ...                              (6 más)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [Instalar seleccionados]  [Salir]
```

### 2. Segunda vez (ya configurado)

```
$ npx skill-manager

✔ Repositorio cargado: ~/mis-skills/ (12 skills)
✔ AI Client: Claude → .claude/skills/

? ¿Qué querés hacer?
  🔍 Buscar skills (FTS5)
  📋 Ver skills instalados
  🔄 Re-escanear repositorio
  ⬆️  Update skills (verificar actualizaciones)
  ⚙️  Configuración
  ❌ Salir
```

### 3. Búsqueda FTS5 e instalación

```
? Buscar skills (FTS5 — busca en nombre, categoría, tags, descripción):
> android base

Resultados para "android base" (ranked by relevance):

  [x] android/base-android          ★ match alto
  [ ] android/compose-testing       ★ match parcial
  [ ] react/base-react              ★ match parcial
  [ ] typescript/base-config

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ☑️  Seleccionar todos
  [Instalar]  [Volver]
```

### 4. Modo de instalación

```
? Modo de instalación:
  📁 Local  → .claude/skills/  (este proyecto)
  🌍 Global → ~/.config/opencode/skills/  (todos los proyectos)

? Confirmar instalación:
  3 skills seleccionados → ~/proyecto/.claude/skills/

  android/base-android
  react/base-react
  typescript/base-config

  [Confirmar]  [Volver]

◌ Instalando...
✔ android/base-android  → SHA-256 verificado
✔ react/base-react      → SHA-256 verificado
✔ typescript/base-config → SHA-256 verificado

╭──────────────────────────────────────────╮
│  ✅ Instalación completada               │
│                                          │
│  3 skills instalados en modo local       │
│  AI Client: Claude → .claude/skills/     │
│  Lock file: skills-lock.json             │
╰──────────────────────────────────────────╯
```

### 5. Update (no chancar sin confirmar)

```
$ npx skill-manager

? ¿Qué querés hacer?
  ⬆️  Update skills

◌ Verificando skills instalados vs repositorio...
✔ 2 skills desactualizados encontrados

  ⚠️  android/base-android
     Instalado: v1.0.0 | Repo: v1.2.0
     Cambios: templates/build.gradle.kts (hash distinto)

  ⚠️  react/base-react
     Instalado: v1.0.0 | Repo: v1.1.0
     Cambios: SKILL.md (hash distinto)

? ¿Actualizar?
  [x] android/base-android  v1.0.0 → v1.2.0
  [ ] react/base-react      v1.0.0 → v1.1.0

  ⚠️  Los archivos existentes serán reemplazados.
     Backup automático: .claude/skills/.backups/

  [Actualizar seleccionados]  [Cancelar]

◌ Actualizando...
◌ Backup de versión anterior creado...
✔ android/base-android actualizado → SHA-256 verificado
✔ skills-lock.json actualizado
```

### 6. Dry-run

```
$ npx skill-manager --dry-run

? Buscar skills: testing

  [x] testing/vitest
  [x] testing/playwright

◌ [DRY-RUN] Simulando instalación...
⚠️  DRY-RUN: No se copiaron archivos
✔ Se instalarían 2 skills en .claude/skills/
```

## Patrones de UI

| Elemento | Librería | Uso |
|----------|----------|-----|
| Spinners | ora | Escaneo, copia, verificación |
| Colores | chalk | ✅✅✅ Verde (éxito), ❌ rojo (error), ⚠️ amarillo (warn) |
| Prompts | inquirer | Input, checkbox, confirm, list, radio |
| Tablas | cli-table3 | Resumen de skills instalados |
| Separadores | chalk + boxen | Cards de bienvenida/resumen |

## Paleta de Feedback

| Estado | Color | Símbolo | Ejemplo |
|--------|-------|---------|---------|
| Éxito | green | ✔ | `✔ Skill instalado` |
| Error | red | ✖ | `✖ Error al copiar` |
| Advertencia | yellow | ⚠ | `⚠ Hash no coincide` |
| Update | yellow | ⬆ | `⬆️ Skill desactualizado` |
| Progreso | cyan | ◌ | `◌ Escaneando...` |
| Info | blue | ℹ | `ℹ Dry-run mode` |
| Match FTS5 | magenta | ★ | `android/base-android ★ match alto` |
