export interface SkillFrontmatter {
  name: string;
  version: string;
  category: string;
  description: string;
  tags: string[];
  priority: number;
  author: string;
  license: string;
  ai_clients: string[];
  detect: {
    frameworks: string[];
    files: string[];
  };
  dependencies: string[];
  conflicts: string[];
  updated_at: string;
}

export interface Skill {
  id: number;
  repo_id: number;
  name: string;
  category: string;
  description: string;
  path: string;
  version: string;
  priority: number;
  tags: string[];
  files: SkillFile[];
  created_at: string;
}

export interface SkillFile {
  id: number;
  skill_id: number;
  path: string;
  hash: string;
  size: number;
}

export interface ParsedSkill {
  frontmatter: SkillFrontmatter;
  files: { path: string; content: Buffer; hash: string; size: number }[];
}

export interface AIClient {
  id: number;
  name: string;
  label: string;
  local_path: string;
  global_path: string;
  is_default: boolean;
}

export interface InstalledSkill {
  id: number;
  skill_id: number;
  project_path: string;
  ai_client_id: number;
  mode: "local" | "global";
  hash: string;
  installed_at: string;
  skill_name?: string;
  skill_category?: string;
  ai_client_name?: string;
}

export interface LockEntry {
  skill_id: number;
  name: string;
  category: string;
  version: string;
  hash: string;
  files?: { path: string; hash: string }[];
  destination: string;
  mode: "local" | "global";
  installed_at: string;
}

export interface SkillLock {
  version: string;
  skills: LockEntry[];
  updated_at: string;
}

export interface RepositoryConfig {
  repository_path: string;
  repository_version: string;
  ai_client: string;
  last_scanned: string;
}

export interface SearchResult {
  id: number;
  name: string;
  category: string;
  description: string;
  rank: number;
  tags: string[];
  installed: boolean;
}
