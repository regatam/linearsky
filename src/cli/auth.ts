import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { WriteStream } from "node:tty";

interface AuthConfig { apiKey: string }
interface HiddenInput {
  isRaw: boolean;
  isPaused(): boolean;
  on(event: string, listener: (...args: any[]) => void): unknown;
  off(event: string, listener: (...args: any[]) => void): unknown;
  pause(): unknown;
  resume(): unknown;
  setRawMode(mode: boolean): unknown;
}
type HiddenOutput = Pick<WriteStream, "write">;

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
  const apiKey = (await hiddenQuestion("Linear personal API key: ")).trim();
  if (!apiKey) throw new Error("A Linear API key is required.");
  await fs.mkdir(path.dirname(configFile), { recursive: true, mode: 0o700 });
  await fs.writeFile(configFile, `${JSON.stringify({ apiKey }, null, 2)}\n`, { mode: 0o600 });
  return apiKey;
}

export function hiddenQuestion(
  message: string,
  input: HiddenInput = process.stdin,
  output: HiddenOutput = process.stdout,
): Promise<string> {
  const wasRaw = input.isRaw;
  const wasPaused = input.isPaused();
  let value = "";

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let rawEnabled = false;
    const restore = () => {
      input.off("data", onData);
      input.off("error", onError);
      if (rawEnabled) input.setRawMode(wasRaw);
      if (wasPaused) input.pause();
      output.write("\n");
    };
    const finish = (result: string | Error) => {
      if (settled) return;
      settled = true;
      restore();
      if (result instanceof Error) reject(result);
      else resolve(result);
    };
    const onError = (error: Error) => finish(error);
    const onData = (chunk: Buffer | string) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\r" || character === "\n") return finish(value);
        if (character === "\u0003" || character === "\u0004") return finish(new Error("API key entry cancelled."));
        if (character === "\u007f" || character === "\b") value = value.slice(0, -1);
        else value += character;
      }
    };
    try {
      output.write(message);
      input.on("data", onData);
      input.on("error", onError);
      input.setRawMode(true);
      rawEnabled = true;
      input.resume();
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export function authConfigPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, "linearsky", "config.json");
}
