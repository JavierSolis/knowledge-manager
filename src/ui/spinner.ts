import ora from "ora";

export function createSpinner(text: string) {
  const spinner = ora({ text, color: "cyan" });
  return spinner;
}

export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>
): Promise<T> {
  const spinner = createSpinner(text);
  spinner.start();
  try {
    const result = await fn();
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}
