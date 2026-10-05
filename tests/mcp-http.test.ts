import { createServer, request as httpRequest } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../src/server.js";
import { connectPageBody } from "../src/connect-page.js";
import { landingPage } from "../src/landing-page.js";

const accept = { "content-type": "application/json", accept: "application/json, text/event-stream" };

describe("public copy", () => {
  it("does not say free or state a price", () => {
    const pages = [
      connectPageBody("http://127.0.0.1:3000"),
      landingPage("http://127.0.0.1:3000", "", "")
    ].join("\n");
    expect(pages.toLowerCase()).not.toMatch(/\bfree\b/);
    expect(pages).not.toMatch(/[$€£]\s*\d/);
  });
});

describe("streamable http discovery", () => {
  let port = 0;
  let server: ReturnType<typeof createServer>;

  beforeAll(async () => {
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  async function post(body: unknown, headers: Record<string, string> = {}) {
    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: { ...accept, ...headers },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    return { status: response.status, text, json: text ? JSON.parse(text) : null };
  }

  it("initializes, accepts the initialized notification, answers ping, and lists tools with no token", async () => {
    const init = await post({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "claim-test", version: "0.0.1" } }
    });
    expect(init.status).toBe(200);
    expect(init.json.result.serverInfo.name).toBe("Claim");

    const ready = await post({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(ready.status).toBe(202);

    const ping = await post({ jsonrpc: "2.0", id: 2, method: "ping" });
    expect(ping.status).toBe(200);
    expect(ping.json.result).toEqual({});

    const tools = await post({ jsonrpc: "2.0", id: 3, method: "tools/list" });
    expect(tools.status).toBe(200);
    const names = tools.json.result.tools.map((tool: { name: string }) => tool.name);
    expect(names).toEqual([
      "list_brands",
      "create_brand",
      "get_brand_guide",
      "save_approved_claim",
      "save_offer",
      "save_proof",
      "save_brand_voice",
      "save_banned_phrase",
      "remove_banned_phrase",
      "check_brand_copy"
    ]);
  });

  it("rejects an API key header", async () => {
    const response = await post({ jsonrpc: "2.0", id: 1, method: "tools/list" }, { "x-api-key": "not-a-token" });
    expect(response.status).toBe(401);
    expect(response.json.error).toMatch(/API key/i);
  });

  it("serves public pages without secrets and without the word free", async () => {
    for (const path of ["/", "/connect", "/terms", "/privacy", "/support", "/health"]) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`);
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body.toLowerCase()).not.toMatch(/\bfree\b/);
      expect(body).not.toMatch(/[$€£]\s*\d/);
    }
  });

  it("publishes a directory-ready privacy policy", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/privacy`);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("October 5, 2026");
    expect(body).toContain("Ouroboros Apps / Lawrence Hutchins");
    expect(body).toContain('href="/support"');
    for (const section of ["Information we process", "Why and where", "Control and retention", "Security and changes"]) {
      expect(body).toContain(section);
    }
    for (const fact of ["brands", "approved claims", "offers", "proof", "voice", "banned phrases", "account email", "Supabase", "Vercel", "Google", "Stripe", "ChatGPT"]) {
      expect(body).toContain(fact);
    }
    expect(body).not.toMatch(/[$€£]\s*\d/);
    expect(body.toLowerCase()).not.toMatch(/\bfree\b/);
  });

  it("serves the OpenAI apps challenge from OPENAI_APPS_CHALLENGE", async () => {
    const previous = process.env.OPENAI_APPS_CHALLENGE;
    try {
      delete process.env.OPENAI_APPS_CHALLENGE;
      const missing = await fetch(`http://127.0.0.1:${port}/.well-known/openai-apps-challenge`);
      expect(missing.status).toBe(404);
      expect(missing.headers.get("content-type")).toMatch(/text/);

      process.env.OPENAI_APPS_CHALLENGE = "challenge-token";
      const present = await fetch(`http://127.0.0.1:${port}/.well-known/openai-apps-challenge`);
      expect(present.status).toBe(200);
      expect(present.headers.get("content-type")).toMatch(/text/);
      expect(await present.text()).toBe("challenge-token");
    } finally {
      if (previous === undefined) delete process.env.OPENAI_APPS_CHALLENGE;
      else process.env.OPENAI_APPS_CHALLENGE = previous;
    }
  });

  it("requires a subscriber before a tool call", async () => {
    const response = await post({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "list_brands", arguments: {} }
    });
    expect(response.status).toBe(401);
  });

  it("lists tools when Accept is missing or not both media types", async () => {
    const body = { jsonrpc: "2.0", id: 5, method: "tools/list" };
    for (const acceptHeader of ["application/json", "*/*", "text/event-stream"]) {
      const response = await post(body, { accept: acceptHeader });
      expect(response.status, acceptHeader).toBe(200);
      expect(response.text).not.toMatch(/Not Acceptable/);
      expect(response.json.result.tools.map((tool: { name: string }) => tool.name)).toContain("list_brands");
    }

    const missing = await postWithoutAccept(port, body);
    expect(missing.status).toBe(200);
    expect(missing.text).not.toMatch(/Not Acceptable/);
    expect(JSON.parse(missing.text).result.tools.map((tool: { name: string }) => tool.name)).toContain("list_brands");
  });

  it("still requires a subscriber for tools/call when Accept is only application/json", async () => {
    const response = await post(
      { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "list_brands", arguments: {} } },
      { accept: "application/json" }
    );
    expect(response.status).toBe(401);
    expect(response.text).not.toMatch(/Not Acceptable/);
  });
});

function postWithoutAccept(port: number, body: unknown) {
  const payload = JSON.stringify(body);
  return new Promise<{ status: number; text: string }>((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: "127.0.0.1",
        port,
        path: "/mcp",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload)
        }
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString("utf8") }));
      }
    );
    req.on("error", reject);
    req.end(payload);
  });
}
