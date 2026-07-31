#!/usr/bin/env node
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ensureApiKey } from "./auth.js";
import { exportSky } from "./export.js";
import { LinearAuthError, pullLinearSnapshot } from "./linear.js";
import { startServer } from "../server/index.js";
import { hasSnapshot, writeSnapshot } from "../server/data.js";
import { createFixtureSnapshot, FIXTURE_ANNOTATION } from "../shared/fixture.js";

const root = process.cwd();
const args = process.argv.slice(2);
const command = args[0]?.startsWith("-") ? "start" : (args.shift() ?? "start");
const fixtureMode = process.env.LINEARSKY_FIXTURE === "1";

try {
  if (command === "pull") await pullCommand();
  else if (command === "start") await startCommand();
  else if (command === "export") await exportCommand();
  else if (["help", "--help", "-h"].includes(command)) printHelp();
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(`linearsky: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

async function pullCommand(): Promise<void> {
  if (fixtureMode) {
    await prepareFixtureWorkspace();
  } else {
    const apiKey = await ensureApiKey();
    try {
      await writeSnapshot(root, await pullLinearSnapshot(apiKey));
    } catch (error) {
      if (!(error instanceof LinearAuthError)) throw error;
      console.warn("linearsky: the saved Linear key was rejected; please enter a fresh key.");
      await writeSnapshot(root, await pullLinearSnapshot(await ensureApiKey(true)));
    }
  }
  console.log(`Updated ${path.join(root, ".linearsky", "snapshot.json")}`);
}

async function startCommand(): Promise<void> {
  let apiKey: string | undefined;
  let initialRefreshFailed = false;
  if (fixtureMode) {
    await prepareFixtureWorkspace();
  } else {
    apiKey = await ensureApiKey();
    try {
      await writeSnapshot(root, await pullLinearSnapshot(apiKey));
    } catch (error) {
      if (error instanceof LinearAuthError) {
        console.warn("linearsky: the saved Linear key was rejected; please enter a fresh key.");
        apiKey = await ensureApiKey(true);
        await writeSnapshot(root, await pullLinearSnapshot(apiKey));
      } else if (await hasSnapshot(root)) {
        initialRefreshFailed = true;
        console.warn(`linearsky: ${error instanceof Error ? error.message : String(error)} Serving the last local snapshot.`);
      } else {
        throw error;
      }
    }
  }

  const port = numberOption("--port", Number(process.env.PORT) || 4242);
  const running = await startServer({
    root,
    port,
    initialRefreshFailed,
    refresh: async () => {
      if (fixtureMode) await prepareFixtureWorkspace(false);
      else await writeSnapshot(root, await pullLinearSnapshot(apiKey ?? await ensureApiKey()));
    },
  });
  console.log(`linearsky is flying at ${running.url}`);
  if (!args.includes("--no-open") && process.env.LINEARSKY_NO_OPEN !== "1") openBrowser(running.url);
}

async function exportCommand(): Promise<void> {
  if (fixtureMode && !(await hasSnapshot(root))) await prepareFixtureWorkspace();
  if (!(await hasSnapshot(root))) throw new Error("No snapshot found. Run linearsky pull first.");
  const output = stringOption("--output", "linearsky-export.html");
  console.log(`Exported ${await exportSky(root, output)}`);
}

async function prepareFixtureWorkspace(writeAnnotation = true): Promise<void> {
  await writeSnapshot(root, createFixtureSnapshot());
  if (!writeAnnotation) return;
  const annotationDirectory = path.join(root, ".linearsky", "annotations");
  const annotationPath = path.join(annotationDirectory, "nimbus-mobile-beta.md");
  await fs.mkdir(annotationDirectory, { recursive: true });
  try {
    await fs.access(annotationPath);
  } catch {
    await fs.writeFile(annotationPath, FIXTURE_ANNOTATION);
  }
}

function openBrowser(url: string): void {
  const commandName = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const commandArgs = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(commandName, commandArgs, { detached: true, stdio: "ignore" });
  child.once("error", (error) => console.warn(`linearsky: could not open the browser: ${error.message}`));
  child.unref();
}

function stringOption(name: string, fallback: string): string {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function numberOption(name: string, fallback: number): number {
  const value = Number(stringOption(name, String(fallback)));
  if (!Number.isInteger(value) || value < 0 || value > 65535) throw new Error(`${name} must be a valid port.`);
  return value;
}

function printHelp(): void {
  console.log(`linearsky — your Linear workspace, seen from above

Usage:
  linearsky start [--port 4242] [--no-open]
  linearsky pull
  linearsky export [--output linearsky-export.html]

Environment:
  LINEAR_API_KEY          use a key without storing it
  LINEARSKY_FIXTURE=1     run the polished demo without Linear credentials
  LINEARSKY_NO_OPEN=1     do not open a browser on start`);
}
