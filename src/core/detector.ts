import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { getAllSkills } from "./registry.js";
import type { Skill } from "../types/skill.js";

export interface DetectedStack {
  frameworks: string[];
  files: string[];
  packageName?: string;
}

export interface SkillMatch {
  skill: Skill;
  matchType: "framework" | "file" | "tag" | "none";
  score: number;
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

export function detectStack(projectPath: string): DetectedStack {
  const frameworks: string[] = [];
  const files: string[] = [];

  const packageJsonPath = join(projectPath, "package.json");
  if (existsSync(packageJsonPath)) {
    files.push("package.json");
    const pkg = readJsonFile(packageJsonPath);
    if (pkg) {
      const deps = { ...(pkg.dependencies as Record<string, string> || {}), ...(pkg.devDependencies as Record<string, string> || {}) };
      const knownFrameworks: Record<string, string[]> = {
        react: ["react", "react-dom"],
        vue: ["vue", "vue-router"],
        angular: ["@angular/core"],
        nextjs: ["next"],
        nuxt: ["nuxt"],
        svelte: ["svelte"],
        express: ["express"],
        fastify: ["fastify"],
        nest: ["@nestjs/core"],
        vitest: ["vitest"],
        jest: ["jest"],
        playwright: ["@playwright/test"],
        tailwind: ["tailwindcss"],
        prisma: ["prisma"],
        typeorm: ["typeorm"],
        graphql: ["graphql", "apollo-server"],
      };

      for (const [framework, packages] of Object.entries(knownFrameworks)) {
        if (packages.some((p) => p in deps)) {
          frameworks.push(framework);
        }
      }

      if (pkg.name) {
        files.push(`package:${pkg.name}`);
      }
    }
  }

  const goModPath = join(projectPath, "go.mod");
  if (existsSync(goModPath)) {
    files.push("go.mod");
    const content = readFileSync(goModPath, "utf-8");
    if (content.includes("github.com/gin-gonic/gin")) frameworks.push("gin");
    if (content.includes("github.com/labstack/echo")) frameworks.push("echo");
    if (content.includes("github.com/gofiber/fiber")) frameworks.push("fiber");
    if (content.includes("github.com/gorilla/mux")) frameworks.push("gorilla-mux");
  }

  const requirementsPath = join(projectPath, "requirements.txt");
  if (existsSync(requirementsPath)) {
    files.push("requirements.txt");
    const content = readFileSync(requirementsPath, "utf-8");
    if (content.includes("django")) frameworks.push("django");
    if (content.includes("flask")) frameworks.push("flask");
    if (content.includes("fastapi")) frameworks.push("fastapi");
  }

  const cargoPath = join(projectPath, "Cargo.toml");
  if (existsSync(cargoPath)) {
    files.push("Cargo.toml");
    const content = readFileSync(cargoPath, "utf-8");
    if (content.includes("actix")) frameworks.push("actix");
    if (content.includes("axum")) frameworks.push("axum");
    if (content.includes("rocket")) frameworks.push("rocket");
  }

  const gemfilePath = join(projectPath, "Gemfile");
  if (existsSync(gemfilePath)) {
    files.push("Gemfile");
    const content = readFileSync(gemfilePath, "utf-8");
    if (content.includes("rails")) frameworks.push("rails");
    if (content.includes("sinatra")) frameworks.push("sinatra");
  }

  const allEntries = readdirSync(projectPath, { withFileTypes: true });
  for (const entry of allEntries) {
    if (entry.isFile()) {
      const name = entry.name.toLowerCase();
      if (name.endsWith(".csproj") || name === "*.sln") frameworks.push("dotnet");
      if (name === "pubspec.yaml") frameworks.push("flutter");
      if (name === "build.gradle.kts" || name === "build.gradle") frameworks.push("android");
    }
  }

  return { frameworks: [...new Set(frameworks)], files: [...new Set(files)] };
}

export function matchSkills(stack: DetectedStack): SkillMatch[] {
  const allSkills = getAllSkills();
  const matches: SkillMatch[] = [];

  for (const skill of allSkills) {
    let matchType: SkillMatch["matchType"] = "none";
    let score = 0;

    const skillFrameworks = skill.tags.filter((t) => stack.frameworks.includes(t));
    if (skillFrameworks.length > 0) {
      matchType = "framework";
      score += skillFrameworks.length * 10;
    }

    if (skill.category && stack.frameworks.includes(skill.category)) {
      if (matchType === "none") matchType = "framework";
      score += 5;
    }

    for (const file of stack.files) {
      if (skill.tags.some((t) => file.includes(t))) {
        if (matchType === "none") matchType = "file";
        score += 3;
      }
    }

    matches.push({ skill, matchType, score });
  }

  return matches.sort((a, b) => b.score - a.score);
}

export function suggestSkills(projectPath: string): SkillMatch[] {
  const stack = detectStack(projectPath);
  return matchSkills(stack).filter((m) => m.score > 0);
}
