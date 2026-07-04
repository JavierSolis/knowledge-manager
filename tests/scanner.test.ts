import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { scanRepository, detectDuplicates } from "../src/core/scanner.js";

const C = join("catalog", "skills");

function createTempSkillRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "scanner-test-"));
  const skillsDir = join(dir, C);

  const androidDir = join(skillsDir, "android", "base-android");
  mkdirSync(androidDir, { recursive: true });
  writeFileSync(
    join(androidDir, "SKILL.md"),
    `---
name: base-android
version: 1.0.0
category: android
description: "Base Android setup"
tags:
  - android
  - kotlin
priority: 10
author: "Test"
license: MIT
ai_clients:
  - claude
dependencies: []
conflicts: []
updated_at: "2026-06-24"
---

# Base Android
`
  );

  const tplDir = join(androidDir, "templates");
  mkdirSync(tplDir);
  writeFileSync(join(tplDir, "build.gradle.kts"), "plugins {}");

  const reactDir = join(skillsDir, "react", "base-react");
  mkdirSync(reactDir, { recursive: true });
  writeFileSync(
    join(reactDir, "SKILL.md"),
    `---
name: base-react
version: 1.0.0
category: react
description: "Base React setup"
tags:
  - react
  - typescript
priority: 10
author: "Test"
license: MIT
ai_clients:
  - claude
dependencies: []
conflicts: []
updated_at: "2026-06-24"
---

# Base React
`
  );
  writeFileSync(join(reactDir, "App.tsx"), "export default function App() { return null; }");

  return dir;
}

describe("scanner", () => {
  let repoDir: string;

  beforeEach(() => {
    repoDir = createTempSkillRepo();
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it("scans and returns all skills from repository", () => {
    const skills = scanRepository(repoDir);
    expect(skills).toHaveLength(2);
  });

  it("parses YAML frontmatter from SKILL.md correctly", () => {
    const skills = scanRepository(repoDir);
    const androidSkill = skills.find((s) => s.frontmatter.name === "base-android");
    expect(androidSkill).toBeDefined();
    expect(androidSkill!.frontmatter.category).toBe("android");
    expect(androidSkill!.frontmatter.tags).toContain("android");
    expect(androidSkill!.frontmatter.tags).toContain("kotlin");
  });

  it("calculates SHA-256 for each file in skill", () => {
    const skills = scanRepository(repoDir);
    const androidSkill = skills.find((s) => s.frontmatter.name === "base-android");
    expect(androidSkill).toBeDefined();
    expect(androidSkill!.files.length).toBeGreaterThan(0);
    for (const file of androidSkill!.files) {
      expect(file.hash).toBeTruthy();
      expect(file.hash).toHaveLength(64);
      expect(file.size).toBeGreaterThan(0);
    }
  });

  it("includes non-SKILL.md files in the file list", () => {
    const skills = scanRepository(repoDir);
    const reactSkill = skills.find((s) => s.frontmatter.name === "base-react");
    expect(reactSkill).toBeDefined();
    const appFile = reactSkill!.files.find((f) => f.path.includes("App.tsx"));
    expect(appFile).toBeDefined();
  });

  it("handles directories without SKILL.md gracefully", () => {
    const emptyDir = join(repoDir, C, "empty-category");
    mkdirSync(emptyDir, { recursive: true });
    const emptySubDir = join(emptyDir, "no-skill");
    mkdirSync(emptySubDir);
    const skills = scanRepository(repoDir);
    expect(skills).toHaveLength(2);
  });

  it("scans only from catalog/skills/ subdirectory", () => {
    const skills = scanRepository(repoDir);
    for (const skill of skills) {
      for (const file of skill.files) {
        expect(file.path.startsWith("catalog/skills/")).toBe(true);
      }
    }
  });

  it("returns empty array when catalog/skills/ is missing", () => {
    const emptyDir = mkdtempSync(join(tmpdir(), "scanner-empty-"));
    const skills = scanRepository(emptyDir);
    expect(skills).toHaveLength(0);
    rmSync(emptyDir, { recursive: true, force: true });
  });

  it("scans skills at any depth (deeply nested like container/category/skill)", () => {
    const deepDir = mkdtempSync(join(tmpdir(), "scanner-deep-"));
    const skillDir = join(deepDir, C, "android", "base-android");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      `---
name: base-android
version: 1.0.0
category: android
description: "Android base"
tags: [android]
priority: 10
author: "Test"
license: MIT
ai_clients:
  - claude
dependencies: []
conflicts: []
updated_at: "2026-06-24"
---

# Base Android
`
    );

    const skills = scanRepository(deepDir);
    expect(skills).toHaveLength(1);
    expect(skills[0].frontmatter.name).toBe("base-android");
    expect(skills[0].frontmatter.category).toBe("android");

    rmSync(deepDir, { recursive: true, force: true });
  });

  it("skips hidden directories and node_modules", () => {
    const skipDir = mkdtempSync(join(tmpdir(), "scanner-skip-"));
    const skillsDir = join(skipDir, C);
    mkdirSync(skillsDir, { recursive: true });
    const hiddenSkill = join(skillsDir, ".hidden", "some-skill");
    mkdirSync(hiddenSkill, { recursive: true });
    writeFileSync(join(hiddenSkill, "SKILL.md"), "---\nname: hidden-skill\n---\n");
    const visibleSkill = join(skillsDir, "my-category", "my-skill");
    mkdirSync(visibleSkill, { recursive: true });
    writeFileSync(join(visibleSkill, "SKILL.md"), "---\nname: my-skill\n---\n");
    mkdirSync(join(skillsDir, "node_modules", "dep"), { recursive: true });

    const skills = scanRepository(skipDir);
    expect(skills).toHaveLength(1);
    expect(skills[0].frontmatter.name).toBe("my-skill");

    rmSync(skipDir, { recursive: true, force: true });
  });

  it("detects duplicates by content fingerprint", () => {
    const dupDir = mkdtempSync(join(tmpdir(), "scanner-dup-"));
    const skillsDir = join(dupDir, C);
    mkdirSync(skillsDir, { recursive: true });
    const s1 = join(skillsDir, "cat-a", "my-skill");
    mkdirSync(s1, { recursive: true });
    writeFileSync(join(s1, "SKILL.md"), "---\nname: my-skill\n---\n");
    const s2 = join(skillsDir, "cat-b", "my-skill");
    mkdirSync(s2, { recursive: true });
    writeFileSync(join(s2, "SKILL.md"), "---\nname: my-skill\n---\n");

    const skills = scanRepository(dupDir);
    const dups = detectDuplicates(skills);
    expect(dups.size).toBe(1);
    expect(dups.has("my-skill")).toBe(true);

    rmSync(dupDir, { recursive: true, force: true });
  });

  it("does not flag same-name skills with different content", () => {
    const dir = mkdtempSync(join(tmpdir(), "scanner-nodup-"));
    const skillsDir = join(dir, C);
    mkdirSync(skillsDir, { recursive: true });
    const s1 = join(skillsDir, "cat-a", "shared-name");
    mkdirSync(s1, { recursive: true });
    writeFileSync(join(s1, "SKILL.md"), "---\nname: shared-name\n---\n");
    writeFileSync(join(s1, "file.txt"), "a");
    const s2 = join(skillsDir, "cat-b", "shared-name");
    mkdirSync(s2, { recursive: true });
    writeFileSync(join(s2, "SKILL.md"), "---\nname: shared-name\n---\n");
    writeFileSync(join(s2, "file.txt"), "b");

    const skills = scanRepository(dir);
    const dups = detectDuplicates(skills);
    expect(dups.size).toBe(0);

    rmSync(dir, { recursive: true, force: true });
  });

  it("works with flat skill structure (no category subdirectory)", () => {
    const flatDir = mkdtempSync(join(tmpdir(), "scanner-flat-"));
    const skillsDir = join(flatDir, C);
    mkdirSync(skillsDir, { recursive: true });
    const skillDir = join(skillsDir, "my-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      `---
name: my-skill
version: 1.0.0
category: tools
description: "A flat skill"
tags: [tool]
priority: 5
author: "Test"
license: MIT
ai_clients:
  - claude
dependencies: []
conflicts: []
updated_at: "2026-06-24"
---

# My Skill
`
    );
    writeFileSync(join(skillDir, "script.sh"), "echo hello");

    const skills = scanRepository(flatDir);
    expect(skills).toHaveLength(1);
    expect(skills[0].frontmatter.name).toBe("my-skill");
    expect(skills[0].files).toHaveLength(2);
    expect(skills[0].files[0].path.endsWith("SKILL.md")).toBe(true);

    rmSync(flatDir, { recursive: true, force: true });
  });
});
