export function wait(ms: number): Promise<unknown> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
