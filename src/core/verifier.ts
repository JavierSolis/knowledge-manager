import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import type { LockEntry } from "../types/skill.js";

function calculateFileHash(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

export function verifySkillFiles(
  basePath: string,
  files: { path: string; hash: string }[]
): { path: string; expected: string; actual: string; ok: boolean }[] {
  return files.map((file) => {
    const fullPath = join(basePath, file.path);
    let actual = "";
    let ok = false;

    try {
      actual = calculateFileHash(fullPath);
      ok = actual === file.hash;
    } catch {
      actual = "FILE_NOT_FOUND";
    }

    return { path: file.path, expected: file.hash, actual, ok };
  });
}

export function verifyLockEntry(
  basePath: string,
  entry: LockEntry
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const skillPath = join(basePath, entry.destination);

  if (!existsSync(skillPath)) {
    errors.push(`Skill directory not found at ${skillPath}`);
    return { ok: false, errors };
  }

  const filesToCheck = entry.files ?? [{ path: "SKILL.md", hash: entry.hash }];

  for (const file of filesToCheck) {
    const fullPath = join(skillPath, file.path);
    if (!existsSync(fullPath)) {
      errors.push(`${file.path} not found`);
      continue;
    }

    try {
      const actualHash = calculateFileHash(fullPath);
      if (actualHash !== file.hash) {
        errors.push(`${file.path}: hash mismatch`);
      }
    } catch {
      errors.push(`${file.path}: error reading file`);
    }
  }

  return { ok: errors.length === 0, errors };
}
