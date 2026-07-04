# 08 — Publicación y Landing Page

## Estrategia de Publicación

### npm (para npx)

```bash
npx skill-manager
```

Publicar como paquete npm:

```bash
npm login
npm publish --access public
```

**Requisitos**:
- `bin` en package.json apunta a `dist/index.js`
- Build con tsup genera ESM
- `sql.js` evita native modules → compatible con npx sin compilación

### Landing Page

Como autoskills, una landing page clara con:

```
landing/
├── index.html          # Hero + features + CTA
├── install.html        # Cómo instalar / docs
├── assets/
│   ├── demo.gif        # GIF del CLI en acción
│   └── logo.svg
└── _config.yml         # Si es GitHub Pages
```

**Secciones**:
1. **Hero**: "Instalá AI skills en tu proyecto en segundos"
2. **Demo**: GIF del CLI corriendo
3. **Features**: FTS5, multi AI client, local primero
4. **Quick Install**: `npx skill-manager`
5. **GitHub Star** button + **Sponsor** button
6. **Docs link** a `/docs/`

**Opciones de hosting**:
| Plataforma | Gratis | Dominio |
|------------|--------|---------|
| GitHub Pages | ✅ | `usuario.github.io/skill-manager` |
| Vercel | ✅ | `skill-manager.vercel.app` |
| Cloudflare Pages | ✅ | `skill-manager.pages.dev` |

> Recomendación: **GitHub Pages** + dominio custom o **Vercel**.
