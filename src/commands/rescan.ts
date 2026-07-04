import { reinitCommand } from "./init.js";

export async function rescanCommand(): Promise<void> {
  await reinitCommand();
}
