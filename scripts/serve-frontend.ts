import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const rootDir = resolve(process.cwd(), "frontend");
const port = Number(process.env.FRONTEND_PORT ?? 4173);
const host = process.env.FRONTEND_HOST ?? "127.0.0.1";

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");
  const pathname =
    requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = resolve(rootDir, `.${pathname}`);

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    const contentType =
      contentTypes[extname(filePath)] ?? "application/octet-stream";

    response.writeHead(200, { "Content-Type": contentType });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
  }
});

server.listen(port, host, () => {
  console.log(`Frontend shell available at http://${host}:${port}`);
});
