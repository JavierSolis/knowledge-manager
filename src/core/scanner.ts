import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative, basename, dirname } from "path";
import { createHash } from "crypto";
import matter from "gray-matter";
import type {
  SkillFrontmatter,
  ParsedSkill,
} from "../types/skill.js";
import { getDatabase, saveDatabase } from "../db/connection.js";

function calculateHash(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function isSkillDirectory(dirPath: string): boolean {
  try {
    const files = readdirSync(dirPath);
    return files.includes("SKILL.md");
  } catch {
    return false;
  }
}

function parseSkillDir(
  dirPath: string,
  repoPath: string
): ParsedSkill | null {
  const skillMdPath = join(dirPath, "SKILL.md");
  try {
    const content = readFileSync(skillMdPath, "utf-8");
    const parsed = matter(content);
    const frontmatter = parsed.data as SkillFrontmatter;

    if (!frontmatter.name) {
      frontmatter.name = relative(repoPath, dirPath).split("/").pop() || "unknown";
    }
    if (!frontmatter.category) {
      frontmatter.category = basename(dirname(dirPath));
    }

    const skillFiles: ParsedSkill["files"] = [];

    const skMdBuffer = readFileSync(skillMdPath);
    skillFiles.push({
      path: relative(repoPath, skillMdPath),
      content: skMdBuffer,
      hash: calculateHash(skMdBuffer),
      size: skMdBuffer.length,
    });

    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === "SKILL.md") continue;
      const entryPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const subEntries = readdirSync(entryPath, { withFileTypes: true });
        for (const sub of subEntries) {
          const subPath = join(entryPath, sub.name);
          if (sub.isFile()) {
            const fileContent = readFileSync(subPath);
            const relPath = relative(repoPath, subPath);
            skillFiles.push({
              path: relPath,
              content: fileContent,
              hash: calculateHash(fileContent),
              size: fileContent.length,
            });
          }
        }
      } else if (entry.isFile()) {
        const fileContent = readFileSync(entryPath);
        const relPath = relative(repoPath, entryPath);
        skillFiles.push({
          path: relPath,
          content: fileContent,
          hash: calculateHash(fileContent),
          size: fileContent.length,
        });
      }
    }

    return {
      frontmatter,
      files: skillFiles,
    };
  } catch {
    return null;
  }
}

function calculateRepoHash(repoPath: string): string {
  const skillsDir = join(repoPath, "catalog", "skills");
  if (!existsSync(skillsDir)) return "";
  const hash = createHash("sha256");
  const entries = readdirSync(skillsDir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      const filePath = entry.parentPath
        ? join(entry.parentPath, entry.name)
        : join(skillsDir, entry.name);
      const content = readFileSync(filePath);
      hash.update(entry.name);
      hash.update(content);
    }
  }
  return hash.digest("hex");
}

function shouldSkipDir(name: string): boolean {
  return name.startsWith(".") || name === "node_modules";
}

function scanDirRecursive(
  dirPath: string,
  repoPath: string
): ParsedSkill[] {
  const skills: ParsedSkill[] = [];
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || shouldSkipDir(entry.name)) continue;
      const fullPath = join(dirPath, entry.name);
      if (isSkillDirectory(fullPath)) {
        const parsed = parseSkillDir(fullPath, repoPath);
        if (parsed) skills.push(parsed);
      } else {
        skills.push(...scanDirRecursive(fullPath, repoPath));
      }
    }
  } catch {
    // skip invalid directories
  }
  return skills;
}

export function scanRepository(repoPath: string): ParsedSkill[] {
  const skillsDir = join(repoPath, "catalog", "skills");
  if (!existsSync(skillsDir)) return [];
  return scanDirRecursive(skillsDir, repoPath);
}

function skillContentFingerprint(skill: ParsedSkill): string {
  const hash = createHash("sha256");
  const fileHashes = skill.files.map((f) => f.hash);
  fileHashes.sort();
  for (const h of fileHashes) {
    hash.update(h);
  }
  return hash.digest("hex");
}

export function detectDuplicates(skills: ParsedSkill[]): Map<string, string[]> {
  const byFingerprint = new Map<string, ParsedSkill[]>();
  for (const s of skills) {
    const fp = skillContentFingerprint(s);
    if (!byFingerprint.has(fp)) byFingerprint.set(fp, []);
    byFingerprint.get(fp)!.push(s);
  }

  const duplicates = new Map<string, string[]>();
  for (const [fp, entries] of byFingerprint) {
    if (entries.length > 1) {
      duplicates.set(entries[0].frontmatter.name, entries.map((e) => e.files[0]?.path || "unknown"));
    }
  }
  return duplicates;
}

export function syncSkillsToDb(
  repoPath: string,
  repoVersion: string,
  skills: ParsedSkill[]
): number {
  const db = getDatabase();
  const repoHash = calculateRepoHash(repoPath);

  db.run("DELETE FROM skills");
  db.run("DELETE FROM repository");

  db.run(
    "INSERT INTO repository (path, version, hash) VALUES (?, ?, ?)",
    [repoPath, repoVersion, repoHash]
  );
  const repoId = db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;

  let skillCount = 0;
  for (const skill of skills) {
    db.run(
      "INSERT INTO skills (repo_id, name, category, description, path, version, priority) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [repoId, skill.frontmatter.name, skill.frontmatter.category, skill.frontmatter.description || "", skill.files[0]?.path || "", skill.frontmatter.version || "1.0.0", skill.frontmatter.priority ?? 10]
    );
    const skillId = db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;

    for (const tag of (skill.frontmatter.tags || []).filter(Boolean)) {
      db.run("INSERT INTO tags (skill_id, tag) VALUES (?, ?)", [skillId, tag]);
    }

    for (const file of skill.files) {
      db.run(
        "INSERT INTO skill_files (skill_id, path, hash, size) VALUES (?, ?, ?, ?)",
        [skillId, file.path, file.hash, file.size]
      );
    }

    skillCount++;
  }

  saveDatabase();
  return skillCount;
}

export function getRepoHash(repoPath: string): string | null {
  const db = getDatabase();
  const result = db.exec(
    "SELECT hash FROM repository WHERE path = ? ORDER BY id DESC LIMIT 1",
    [repoPath]
  );
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0] as string;
  }
  return null;
}

export function hasRepoChanged(repoPath: string): boolean {
  const currentHash = calculateRepoHash(repoPath);
  const storedHash = getRepoHash(repoPath);
  return currentHash !== storedHash;
}

export function detectInstalledFromProject(
  projectPath: string,
  installRelativePath: string,
  aiClientId: number,
): number {
  const db = getDatabase();
  const installPath = join(projectPath, installRelativePath);
  if (!existsSync(installPath)) return 0;

  db.run("DELETE FROM installed WHERE project_path = ?", [projectPath]);

  const entries = readdirSync(installPath, { withFileTypes: true });
  let inserted = 0;

  for (const entry of entries) {
    if (!entry.isDirectory() || shouldSkipDir(entry.name)) continue;
    const skillDir = join(installPath, entry.name);
    const skMdPath = join(skillDir, "SKILL.md");
    if (!existsSync(skMdPath)) continue;

    const projectHash = calculateHash(readFileSync(skMdPath));

    const result = db.exec(
      `SELECT s.id FROM skills s
       JOIN skill_files sf ON sf.skill_id = s.id
       WHERE s.name = ? AND sf.path LIKE '%/SKILL.md' AND sf.hash = ?`,
      [entry.name, projectHash],
    );

    if (!result[0]?.values.length) continue;

    const skillId = result[0].values[0][0] as number;
    db.run(
      "INSERT INTO installed (skill_id, project_path, ai_client_id, mode, hash) VALUES (?, ?, ?, ?, ?)",
      [skillId, projectPath, aiClientId, "local", projectHash],
    );
    inserted++;
  }

  if (inserted > 0) saveDatabase();
  return inserted;
}
