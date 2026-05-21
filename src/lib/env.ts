/**
 * Retrieves an environment variable by name.
 * Returns undefined if the variable is not set or only contains whitespace.
 *
 * @param name - The name of the environment variable to retrieve.
 * @returns The trimmed string value of the environment variable, or undefined.
 */
export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : undefined;
}

/**
 * Retrieves a required environment variable by name.
 * Throws an error if the variable is not set or is empty.
 *
 * @param name - The name of the environment variable to retrieve.
 * @returns The trimmed string value of the environment variable.
 * @throws {Error} If the environment variable is missing or empty.
 */
export function requireEnv(name: string): string {
  const value = optionalEnv(name);
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

