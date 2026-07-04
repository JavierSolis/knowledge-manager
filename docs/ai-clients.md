# AI Clients

## Clientes Soportados

| AI Client | Ruta Local (proyecto) | Ruta Global |
|-----------|----------------------|-------------|
| Claude | `.claude/skills/` | `~/.config/opencode/skills/` |
| Gemini CLI | *(futuro)* | *(futuro)* |
| Codex CLI | *(futuro)* | *(futuro)* |

## Cómo se usa

Durante `skill-manager init`, se selecciona el AI client. Esto determina:

- **La ruta de instalación**: dónde se copian los skills
- **El formato de los skills**: algunos AI clients esperan formatos específicos
- **Los comandos posteriores**: la herramienta usa esta info para operar

## Actual

**MVP**: solo Claude. La arquitectura soporta agregar más AI Clients via tabla `ai_clients` en la base de datos.
