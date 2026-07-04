import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { initDatabase, closeDatabase } from "../src/db/connection.js";
import { syncSkillsToDb, scanRepository } from "../src/core/scanner.js";
import { detectStack, matchSkills, suggestSkills } from "../src/core/detector.js";

function createProjectWithStack(): string {
  const dir = mkdtempSync(join(tmpdir(), "detect-project-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({
    name: "test-app",
    dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
    devDependencies: { vitest: "^2.0.0" },
  }));
  return dir;
}

function createSkillRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "detect-repo-"));
  const skillsDir = join(dir, "catalog", "skills");
  const reactSkill = join(skillsDir, "react", "base-react");
  mkdirSync(reactSkill, { recursive: true });
  writeFileSync(join(reactSkill, "SKILL.md"),
    `---
name: base-react
version: 1.0.0
category: react
description: "React base setup"
tags:
  - react
  - typescript
priority: 10
author: "Test"
license: MIT
ai_clients:
  - claude
detect:
  frameworks: ["react"]
  files: ["package.json"]
dependencies: []
conflicts: []
updated_at: "2026-06-24"
---

# Base React
`);
  writeFileSync(join(reactSkill, "App.tsx"), "export default function App() { return null; }");

  const testSkill = join(skillsDir, "testing", "vitest-config");
  mkdirSync(testSkill, { recursive: true });
  writeFileSync(join(testSkill, "SKILL.md"),
    `---
name: vitest-config
version: 1.0.0
category: testing
description: "Vitest config"
tags:
  - vitest
  - testing
priority: 10
author: "Test"
license: MIT
ai_clients:
  - claude
detect:
  frameworks: ["vitest"]
  files: ["vitest.config.ts"]
dependencies: []
conflicts: []
updated_at: "2026-06-24"
---

# Vitest Config
`);

  const androidSkill = join(skillsDir, "android", "base-android");
  mkdirSync(androidSkill, { recursive: true });
  writeFileSync(join(androidSkill, "SKILL.md"),
    `---
name: base-android
version: 1.0.0
category: android
description: "Android base"
tags:
  - android
  - kotlin
priority: 10
author: "Test"
license: MIT
ai_clients:
  - claude
detect:
  frameworks: ["android"]
  files: ["build.gradle.kts"]
dependencies: []
conflicts: []
updated_at: "2026-06-24"
---

# Base Android
`);

  return dir;
}

describe("detector", () => {
  let projectDir: string;
  let repoDir: string;

  beforeAll(async () => {
    await initDatabase();
    repoDir = createSkillRepo();
    const skills = scanRepository(repoDir);
    syncSkillsToDb(repoDir, "1.0.0", skills);
    projectDir = createProjectWithStack();
  });

  afterAll(() => {
    closeDatabase();
    rmSync(repoDir, { recursive: true, force: true });
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("detects React project from package.json", () => {
    const stack = detectStack(projectDir);
    expect(stack.frameworks).toContain("react");
    expect(stack.files).toContain("package.json");
  });

  it("detects vitest from devDependencies", () => {
    const stack = detectStack(projectDir);
    expect(stack.frameworks).toContain("vitest");
  });

  it("returns empty stack for empty project", () => {
    const emptyDir = mkdtempSync(join(tmpdir(), "detect-empty-"));
    const stack = detectStack(emptyDir);
    expect(stack.frameworks).toHaveLength(0);
    expect(stack.files).toHaveLength(0);
    rmSync(emptyDir, { recursive: true, force: true });
  });

  it("matches skills based on detected frameworks", () => {
    const stack = detectStack(projectDir);
    const matches = matchSkills(stack);
    const reactMatch = matches.find((m) => m.skill.name === "base-react");
    expect(reactMatch).toBeDefined();
    expect(reactMatch!.matchType).toBe("framework");
    expect(reactMatch!.score).toBeGreaterThan(0);

    const vitestMatch = matches.find((m) => m.skill.name === "vitest-config");
    expect(vitestMatch).toBeDefined();
    expect(vitestMatch!.score).toBeGreaterThan(0);
  });

  it("does not match unrelated skills", () => {
    const stack = detectStack(projectDir);
    const matches = matchSkills(stack);
    const androidMatch = matches.find((m) => m.skill.name === "base-android");
    expect(androidMatch).toBeDefined();
    expect(androidMatch!.matchType).not.toBe("framework");
  });

  it("suggestSkills returns only relevant matches", () => {
    const suggestions = suggestSkills(projectDir);
    expect(suggestions.length).toBeGreaterThan(0);
    const names = suggestions.map((s) => s.skill.name);
    expect(names).toContain("base-react");
    expect(names).toContain("vitest-config");
  });

  it("detects stack from go.mod", () => {
    const goDir = mkdtempSync(join(tmpdir(), "detect-go-"));
    writeFileSync(join(goDir, "go.mod"), "module test\n\ngo 1.22\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.0\n)");
    const stack = detectStack(goDir);
    expect(stack.files).toContain("go.mod");
    expect(stack.frameworks).toContain("gin");
    rmSync(goDir, { recursive: true, force: true });
  });

  it("detects stack from requirements.txt", () => {
    const pyDir = mkdtempSync(join(tmpdir(), "detect-py-"));
    writeFileSync(join(pyDir, "requirements.txt"), "django==5.0\nflask==3.0");
    const stack = detectStack(pyDir);
    expect(stack.files).toContain("requirements.txt");
    expect(stack.frameworks).toContain("django");
    expect(stack.frameworks).toContain("flask");
    rmSync(pyDir, { recursive: true, force: true });
  });

  it("detects stack from build.gradle.kts", () => {
    const androidDir = mkdtempSync(join(tmpdir(), "detect-android-"));
    writeFileSync(join(androidDir, "build.gradle.kts"), "plugins { id(\"com.android.application\") }");
    const stack = detectStack(androidDir);
    expect(stack.frameworks).toContain("android");
    rmSync(androidDir, { recursive: true, force: true });
  });
});
