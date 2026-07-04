import type { AIClient } from "./skill.js";

export interface AppConfig {
  repositoryPath: string;
  repositoryVersion: string;
  aiClient: string;
  lastScanned: string;
}

export interface InitAnswers {
  repositoryPath: string;
  aiClient: string;
}

export interface InstallAnswers {
  skillIds: number[];
  mode: "local" | "global";
}
