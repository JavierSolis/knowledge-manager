import chalk from "chalk";

export const success = (text: string) => chalk.green(`✔ ${text}`);
export const error = (text: string) => chalk.red(`✖ ${text}`);
export const warning = (text: string) => chalk.yellow(`⚠ ${text}`);
export const info = (text: string) => chalk.blue(`ℹ ${text}`);
export const progress = (text: string) => chalk.cyan(`◌ ${text}`);
export const match = (text: string) => chalk.magenta(`★ ${text}`);
export const highlight = (text: string) => chalk.bold(text);
export const dim = (text: string) => chalk.dim(text);
export const header = (text: string) => chalk.bold.blue(text);
export const successBold = (text: string) => chalk.bold.green(`✔ ${text}`);

export const cyan = (text: string) => chalk.cyan(text);
export const green = (text: string) => chalk.green(text);
export const red = (text: string) => chalk.red(text);
export const yellow = (text: string) => chalk.yellow(text);
export const bold = (text: string) => chalk.bold(text);
