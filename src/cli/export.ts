import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSkyData } from "../server/data.js";

export async function exportSky(root: string, output: string): Promise<string> {
  const clientRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../client");
  const data = await readSkyData(root);
  const sourceHtml = await fs.readFile(path.join(clientRoot, "index.html"), "utf8");

  const stylesheet = sourceHtml.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
  const css = stylesheet ? await fs.readFile(path.join(clientRoot, stylesheet[1].replace(/^\//, "")), "utf8") : "";
  const script = sourceHtml.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
  if (!script) throw new Error("Built client entry was not found. Run npm run build first.");
  const javascript = await fs.readFile(path.join(clientRoot, script[1].replace(/^\//, "")), "utf8");
  const serialized = JSON.stringify(data).replaceAll("<", "\\u003c");
  const html = inlineClientHtml(sourceHtml, css, javascript, serialized);

  const destination = path.resolve(root, output);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, html);
  return destination;
}

export function inlineClientHtml(html: string, css: string, javascript: string, serializedData: string): string {
  const stylesheet = html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
  if (stylesheet) html = html.replace(stylesheet[0], () => `<style>${css}</style>`);
  const script = html.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
  if (!script) throw new Error("Built client entry was not found. Run npm run build first.");
  return html.replace(script[0], () => `<script>window.__LINEARSKY_DATA__=${serializedData}</script><script type="module">${javascript}</script>`);
}
