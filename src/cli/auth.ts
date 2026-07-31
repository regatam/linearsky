import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";

interface AuthConfig { apiKey: string }

export async function ensureApiKey(forcePrompt = false): Promise<string> {
  if (!forcePrompt && process.env.LINEAR_API_KEY?.trim()) return process.env.LINEAR_API_KEY.trim();
  const configFile = authConfigPath();
  if (!forcePrompt) {
    try {
      const config = JSON.parse(await fs.readFile(configFile, "utf8")) as AuthConfig;
      if (config.apiKey?.trim()) return config.apiKey.trim();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn("linearsky: existing auth config could not be read; asking for a new key.");
      }
    }
  }
  if (!process.stdin.isTTY) {
    throw new Error("No Linear API key found. Run linearsky in a terminal once, or set LINEAR_API_KEY.");
  }
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const apiKey = (await prompt.question("Linear personal API key: ")).trim();
  prompt.close();
  if (!apiKey) throw new Error("A Linear API key is required.");
  await fs.mkdir(path.dirname(configFile), { recursive: true, mode: 0o700 });
  await fs.writeFile(configFile, `${JSON.stringify({ apiKey }, null, 2)}\n`, { mode: 0o600 });
  return apiKey;
}

export function authConfigPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, "linearsky", "config.json");
}
