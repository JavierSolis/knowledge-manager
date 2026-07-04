import { getDatabase } from "../db/connection.js";
import type { SearchResult, AIClient, Skill, SkillFile, InstalledSkill } from "../types/skill.js";


export function searchSkillsFts(query: string): SearchResult[] {
  const db = getDatabase();
  const sanitized = query.replace(/['"]/g, "").replace(/[^\w\s*-]/g, "");
  const ftsQuery = sanitized
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => (term.endsWith("*") ? term : `${term}*`))
    .join(" AND ");

  if (!ftsQuery) return [];

  try {
    const result = db.exec(
      `SELECT s.id, s.name, s.category, s.description, bm25(skills_fts) as rank
       FROM skills_fts
       JOIN skills s ON s.id = skills_fts.rowid
       WHERE skills_fts MATCH ?
       ORDER BY rank`,
      [ftsQuery]
    );

    return result[0]?.values.map((row) => ({
      id: row[0] as number,
      name: row[1] as string,
      category: row[2] as string,
      description: row[3] as string,
      rank: row[4] as number,
      tags: [],
      installed: false,
    })) || [];
  } catch {
    const likeQuery = `%${query}%`;
    const result = db.exec(
      `SELECT id, name, category, description FROM skills
       WHERE name LIKE ? OR category LIKE ? OR description LIKE ?
       ORDER BY priority DESC`,
      [likeQuery, likeQuery, likeQuery]
    );

    return result[0]?.values.map((row) => ({
      id: row[0] as number,
      name: row[1] as string,
      category: row[2] as string,
      description: row[3] as string,
      rank: 0,
      tags: [],
      installed: false,
    })) || [];
  }
}

export function getSkillsByCategory(category: string): Skill[] {
  const db = getDatabase();
  const result = db.exec(
    "SELECT id, repo_id, name, category, description, path, version, priority, created_at FROM skills WHERE category = ? ORDER BY priority DESC",
    [category]
  );

  return result[0]?.values.map((row) => ({
    id: row[0] as number,
    repo_id: row[1] as number,
    name: row[2] as string,
    category: row[3] as string,
    description: row[4] as string,
    path: row[5] as string,
    version: row[6] as string,
    priority: row[7] as number,
    tags: [],
    files: [],
    created_at: row[8] as string,
  })) || [];
}

export function getAllSkills(): Skill[] {
  const db = getDatabase();
  const result = db.exec(
    "SELECT id, repo_id, name, category, description, path, version, priority, created_at FROM skills ORDER BY category, priority DESC"
  );

  return result[0]?.values.map((row) => {
    const skillId = row[0] as number;
    const tagsResult = db.exec("SELECT tag FROM tags WHERE skill_id = ?", [skillId]);
    const tags = tagsResult[0]?.values.map((t) => t[0] as string) || [];

    return {
      id: skillId,
      repo_id: row[1] as number,
      name: row[2] as string,
      category: row[3] as string,
      description: row[4] as string,
      path: row[5] as string,
      version: row[6] as string,
      priority: row[7] as number,
      tags,
      files: [],
      created_at: row[8] as string,
    };
  }) || [];
}

export function getSkillById(id: number): Skill | null {
  const db = getDatabase();
  const result = db.exec(
    "SELECT id, repo_id, name, category, description, path, version, priority, created_at FROM skills WHERE id = ?",
    [id]
  );

  if (!result[0]?.values.length) return null;

  const row = result[0].values[0];
  const skillId = row[0] as number;

  const tagsResult = db.exec("SELECT tag FROM tags WHERE skill_id = ?", [skillId]);
  const tags = tagsResult[0]?.values.map((t) => t[0] as string) || [];

  const filesResult = db.exec("SELECT id, skill_id, path, hash, size FROM skill_files WHERE skill_id = ?", [skillId]);
  const files: SkillFile[] = filesResult[0]?.values.map((f) => ({
    id: f[0] as number,
    skill_id: f[1] as number,
    path: f[2] as string,
    hash: f[3] as string,
    size: f[4] as number,
  })) || [];

  return {
    id: skillId,
    repo_id: row[1] as number,
    name: row[2] as string,
    category: row[3] as string,
    description: row[4] as string,
    path: row[5] as string,
    version: row[6] as string,
    priority: row[7] as number,
    tags,
    files,
    created_at: row[8] as string,
  };
}

export function getAIClients(): AIClient[] {
  const db = getDatabase();
  const result = db.exec("SELECT id, name, label, local_path, global_path, is_default FROM ai_clients ORDER BY id");

  return result[0]?.values.map((row) => ({
    id: row[0] as number,
    name: row[1] as string,
    label: row[2] as string,
    local_path: row[3] as string,
    global_path: row[4] as string,
    is_default: row[5] as number === 1,
  })) || [];
}

export function getAIClientByName(name: string): AIClient | null {
  const clients = getAIClients();
  return clients.find((c) => c.name === name) || null;
}

export function getInstalledSkills(projectPath: string): InstalledSkill[] {
  const db = getDatabase();
  const result = db.exec(
    `SELECT i.id, i.skill_id, i.project_path, i.ai_client_id, i.mode, i.hash, i.installed_at,
            s.name as skill_name, s.category as skill_category, ac.name as ai_client_name
     FROM installed i
     JOIN skills s ON s.id = i.skill_id
     JOIN ai_clients ac ON ac.id = i.ai_client_id
     WHERE i.project_path = ?
     ORDER BY i.installed_at DESC`,
    [projectPath]
  );

  return result[0]?.values.map((row) => ({
    id: row[0] as number,
    skill_id: row[1] as number,
    project_path: row[2] as string,
    ai_client_id: row[3] as number,
    mode: row[4] as "local" | "global",
    hash: row[5] as string,
    installed_at: row[6] as string,
    skill_name: row[7] as string,
    skill_category: row[8] as string,
    ai_client_name: row[9] as string,
  })) || [];
}

export function isSkillInstalled(skillId: number, projectPath: string): boolean {
  const db = getDatabase();
  const result = db.exec(
    "SELECT id FROM installed WHERE skill_id = ? AND project_path = ?",
    [skillId, projectPath]
  );
  return result[0]?.values.length > 0;
}

export function getSkillRepositoryInfo(): { path: string; version: string; scanned_at: string } | null {
  const db = getDatabase();
  const result = db.exec("SELECT path, version, scanned_at FROM repository ORDER BY id DESC LIMIT 1");
  if (!result[0]?.values.length) return null;
  const row = result[0].values[0];
  return { path: row[0] as string, version: row[1] as string, scanned_at: row[2] as string };
}

export function getSkillCount(): number {
  const db = getDatabase();
  const result = db.exec("SELECT COUNT(*) FROM skills");
  return result[0]?.values[0]?.[0] as number || 0;
}
