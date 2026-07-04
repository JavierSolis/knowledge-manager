import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { AppConfig } from "../types/config.js";

const CONFIG_DIR = join(homedir(), ".config", "knowledge-manager");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): AppConfig | null {
  if (!existsSync(CONFIG_PATH)) return null;

  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as AppConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: AppConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function getDefaultConfig(): AppConfig {
  return {
    repositoryPath: "",
    repositoryVersion: "1.0.0",
    aiClient: "claude",
    lastScanned: "",
  };
}

export function resetConfig(): void {
  const config = getDefaultConfig();
  saveConfig(config);
}
