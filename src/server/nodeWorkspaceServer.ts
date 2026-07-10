import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { apiFailure } from "../api/workspaceApiMappers";
import type { WorkspaceHttpHandler, WorkspaceHttpRequest } from "../api/workspaceHttpApi";
import type { NodeServerConfig } from "./nodeServerConfig";

export interface RunningNodeWorkspaceServer {
  server: Server;
  url: string;
  close(): Promise<void>;
}

export function createNodeWorkspaceServer(
  handler: WorkspaceHttpHandler,
  config: NodeServerConfig,
): Server {
  const server = createServer((request, response) => {
    void handleNodeRequest(request, response, handler, config).catch(() => {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      writeJson(
        response,
        503,
        apiFailure("runtime_unavailable", "Delphi workspace service is unavailable."),
      );
    });
  });

  server.requestTimeout = config.requestTimeoutMs;
  server.headersTimeout = Math.min(config.requestTimeoutMs, 10_000);
  server.keepAliveTimeout = 5_000;
  return server;
}

export async function listenNodeWorkspaceServer(
  handler: WorkspaceHttpHandler,
  config: NodeServerConfig,
  port = config.port,
): Promise<RunningNodeWorkspaceServer> {
  const server = createNodeWorkspaceServer(handler, config);
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(port, config.host, () => {
      server.off("error", onError);
      resolve();
    });
  });

  const address = server.address() as AddressInfo | null;
  if (!address) {
    await closeServer(server);
    throw new Error("Delphi server did not expose a listening address.");
  }
  const host = config.host.includes(":") ? `[${config.host}]` : config.host;

  return {
    server,
    url: `http://${host}:${address.port}`,
    close: () => closeServer(server),
  };
}

async function handleNodeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  handler: WorkspaceHttpHandler,
  config: NodeServerConfig,
): Promise<void> {
  const allowedOrigin = corsOrigin(request.headers.origin, config.allowedOrigins);
  if (request.headers.origin && !allowedOrigin) {
    writeJson(response, 403, apiFailure("validation_failed", "Browser origin is not allowed."));
    return;
  }
  if (allowedOrigin) {
    response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    response.setHeader("Vary", "Origin");
  }

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Accept, Content-Type");
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", "http://localhost");
  if (request.method === "GET" && url.pathname === "/healthz") {
    writeJson(response, 200, { status: "ok" });
    return;
  }

  if (request.method !== "GET" && request.method !== "POST") {
    writeJson(response, 405, apiFailure("validation_failed", "HTTP method is not allowed."));
    return;
  }

  let body: unknown;
  try {
    body = request.method === "POST" ? await readJsonBody(request, config.bodyLimitBytes) : undefined;
  } catch (error) {
    const status = error instanceof PayloadTooLargeError ? 413 : 400;
    const message = status === 413 ? "Request body exceeds the configured limit." : "Request body must be valid JSON.";
    writeJson(response, status, apiFailure("validation_failed", message));
    return;
  }

  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  const workspaceRequest: WorkspaceHttpRequest = {
    method: request.method,
    path: url.pathname,
    query,
    body,
  };
  const workspaceResponse = await handler(workspaceRequest);
  writeJson(response, workspaceResponse.status, workspaceResponse.body);
}

async function readJsonBody(request: IncomingMessage, limit: number): Promise<unknown> {
  const contentLength = request.headers["content-length"];
  if (contentLength && Number(contentLength) > limit) {
    request.resume();
    throw new PayloadTooLargeError();
  }

  const chunks: Buffer[] = [];
  let size = 0;
  let tooLarge = false;
  for await (const rawChunk of request) {
    const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
    size += chunk.byteLength;
    if (size > limit) {
      tooLarge = true;
      continue;
    }
    chunks.push(chunk);
  }
  if (tooLarge) throw new PayloadTooLargeError();
  if (size === 0) return undefined;

  const contentType = request.headers["content-type"] ?? "";
  if (!contentType.toLowerCase().includes("application/json")) throw new InvalidJsonError();
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new InvalidJsonError();
  }
}

function corsOrigin(origin: string | undefined, allowedOrigins: string[]): string | null {
  if (!origin) return null;
  if (allowedOrigins.includes("*")) return "*";
  return allowedOrigins.includes(origin) ? origin : null;
}

function writeJson(response: ServerResponse, status: number, body: unknown): void {
  const serialized = JSON.stringify(body);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", Buffer.byteLength(serialized));
  response.setHeader("Cache-Control", "no-store");
  response.end(serialized);
}

function closeServer(server: Server): Promise<void> {
  if (!server.listening) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

class PayloadTooLargeError extends Error {}
class InvalidJsonError extends Error {}
