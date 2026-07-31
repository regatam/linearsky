import { createReadStream, watch } from "node:fs";
import { promises as fs } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSkyData } from "./data.js";

export interface ServerOptions {
  root: string;
  port: number;
  refresh: () => Promise<void>;
  initialRefreshFailed?: boolean;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".map": "application/json; charset=utf-8",
};

export async function startServer(options: ServerOptions): Promise<{ url: string; close: () => Promise<void> }> {
  const clientRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../client");
  await fs.access(path.join(clientRoot, "index.html"));
  const streams = new Set<ServerResponse>();
  let refreshFailed = options.initialRefreshFailed ?? false;

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname === "/api/data" && request.method === "GET") {
        return json(response, 200, await readSkyData(options.root, refreshFailed));
      }
      if (url.pathname === "/api/refresh" && request.method === "POST") {
        try {
          await options.refresh();
          refreshFailed = false;
        } catch (error) {
          refreshFailed = true;
          throw error;
        }
        const data = await readSkyData(options.root, refreshFailed);
        broadcast(streams, data);
        return json(response, 200, data);
      }
      if (url.pathname === "/api/events" && request.method === "GET") {
        response.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        });
        response.write(": connected\n\n");
        streams.add(response);
        request.on("close", () => streams.delete(response));
        return;
      }
      await serveStatic(clientRoot, url.pathname, response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      json(response, 500, { error: message });
    }
  });

  const annotationDirectory = path.join(options.root, ".linearsky", "annotations");
  await fs.mkdir(annotationDirectory, { recursive: true });
  let debounce: NodeJS.Timeout | undefined;
  const watcher = watch(annotationDirectory, { persistent: false }, () => {
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      try { broadcast(streams, await readSkyData(options.root, refreshFailed)); } catch { /* next valid write will retry */ }
    }, 80);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : options.port;
  return {
    url: `http://127.0.0.1:${port}`,
    close: async () => {
      watcher.close();
      clearTimeout(debounce);
      for (const stream of streams) stream.end();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}

async function serveStatic(root: string, pathname: string, response: ServerResponse): Promise<void> {
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  let destination = path.resolve(root, relative);
  if (!destination.startsWith(`${root}${path.sep}`) && destination !== root) return json(response, 404, { error: "Not found" });
  try {
    const stat = await fs.stat(destination);
    if (stat.isDirectory()) destination = path.join(destination, "index.html");
  } catch {
    destination = path.join(root, "index.html");
  }
  response.writeHead(200, {
    "Content-Type": MIME[path.extname(destination)] ?? "application/octet-stream",
    "Cache-Control": destination.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
  });
  createReadStream(destination).pipe(response);
}

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(value));
}

function broadcast(streams: Set<ServerResponse>, value: unknown): void {
  const event = `event: sky-update\ndata: ${JSON.stringify(value)}\n\n`;
  for (const stream of streams) stream.write(event);
}
