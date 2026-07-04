[🇪🇸 Español](README.md) · [🇬🇧 English](#english)

---

# Knowledge Manager

Tools like [autoskills](https://github.com/midudev/autoskills) use a centralized registry: you can't control versions, share skills with your team, or keep private skills. **Knowledge Manager** works like a package manager for skills — your Git repo is your registry. You version them, your team grows the catalog, and everyone installs from there. Public repo, private repo, or multiple sources. Like npm/pip but for AI skills.

## Prerequisites

You need a skill repository with a valid structure. The repository can be any local folder containing:

```
<my-repo>/
├── catalog/
│   └── skill/
│       ├── my-skill/
│       │   ├── SKILL.md
│       │   └── ...
│       └── another-skill/
│           └── ...
```

The root folder (e.g. `~/projects/my-repo`) is your "repository". Skills go inside `catalog/skill/`, each in its own subfolder.

> ⚠️ **Important**: when the tool asks for the repository path, enter the **root** (e.g. `~/projects/my-repo`), **not** the `catalog/skill/` subfolder.

There's a working example in [ejemplo-skills/](./ejemplo-skills) so you can see the structure and test it.

## Quick Start

```bash
npx knowledge-manager
```

One command. First run auto-configures the repository and opens the interactive search. Subsequent runs go directly to searching and installing skills.

You can also use the short alias:

```bash
npx km
```

## How it works

1. Scans your local skills folder
2. Indexes them in SQLite with FTS5 search
3. Opens an interactive TUI to browse and select
4. Installs selected skills with SHA-256 verification

## Stack

| Layer    | Technology                       |
| -------- | -------------------------------- |
| Runtime  | Node.js >= 22                    |
| Language | TypeScript 5.x                   |
| CLI      | Commander + TUI raw mode + chalk |
| DB       | SQLite + FTS5 (sql.js)           |
| Build    | tsup                             |
| Tests    | vitest                           |

## Command reference

```bash
npx knowledge-manager init          # Configure repo and AI client
npx knowledge-manager search        # Search and install skills (TUI)
npx knowledge-manager install       # Same as search (alias)
npx knowledge-manager list          # List installed skills
npx knowledge-manager update        # Update installed skills
npx knowledge-manager rescan        # Re-scan repository
npx knowledge-manager verify        # Verify integrity
npx knowledge-manager repair        # Re-install corrupted skills
npx knowledge-manager conflict      # Detect and resolve conflicts
npx knowledge-manager steal         # Extract unregistered skills
npx knowledge-manager status        # Show installation status
npx knowledge-manager reset         # Reset all configuration
npx knowledge-manager --help        # Show all commands
```

## License

MIT

---

# Contact

<div align="center">
    
   <img src="docs/images/contact_img.png" width="90" align="center" alt="gato"/>

#### Javier Solis

👓 https://www.linkedin.com/in/android-developer-peru/

💼 https://www.behance.net/JavierJSolis

</div>
