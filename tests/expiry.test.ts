import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createClaimServer, type ClaimDb, type Row } from "../src/claim-tools.js";

const BRAND = "11111111-1111-4111-8111-111111111111";
const PAST = "2020-01-01T00:00:00.000Z";

function fakeDb(claims: Row[], offers: Row[]) {
  const writes: Array<{ path: string; body: unknown }> = [];
  const db = (async (path: string, options?: RequestInit) => {
    if (options?.method && options.method !== "GET") writes.push({ path, body: JSON.parse(String(options.body ?? "null")) });
    if (path.startsWith("/rest/v1/claim_brands")) return [{ id: BRAND, name: "Acme" }];
    if (path.startsWith("/rest/v1/claim_approved_claims")) return claims;
    if (path.startsWith("/rest/v1/claim_offers")) return offers;
    return [];
  }) as ClaimDb;
  return { db, writes };
}

async function connect(db: ClaimDb) {
  const server = createClaimServer(db, "user-1");
  const client = new Client({ name: "t", version: "0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b);
  await client.connect(a);
  return client;
}

async function call(client: Client, name: string, args: Record<string, unknown>) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as Array<{ type: string; text?: string }>).find((item) => item.type === "text");
  return JSON.parse(text?.text ?? "null");
}

describe("claim expiry", () => {
  it("rejects copy backed only by an expired guarantee or offer and logs usage", async () => {
    const { db, writes } = fakeDb(
      [{ id: "c1", statement: "Every plan has a 30-day money-back guarantee.", status: "APPROVED", revision: 2, expires_at: PAST }],
      [{ id: "o1", name: "Spring sale", terms: "20% off annual plans", active: true, revision: 1, expires_at: PAST }]
    );
    const client = await connect(db);
    const guarantee = await call(client, "check_brand_copy", { brandId: BRAND, draft: "Every plan has a 30-day money-back guarantee." });
    expect(guarantee.verdict).toBe("rejected");
    expect(guarantee.stale_ignored).toHaveLength(2);
    const offer = await call(client, "check_brand_copy", { brandId: BRAND, draft: "Get 20% off annual plans." });
    expect(offer.verdict).toBe("rejected");
    const usage = writes.filter((w) => w.path === "/rest/v1/claim_fact_usage").flatMap((w) => w.body as Row[]);
    expect(usage).toContainEqual(expect.objectContaining({ fact_id: "c1", revision: 2, stale: true }));
  });

  it("flags stale records in the brand guide and keeps unexpired ones usable", async () => {
    const { db } = fakeDb(
      [{ id: "c1", statement: "Every plan has a 30-day money-back guarantee.", status: "APPROVED", revision: 1, expires_at: null }],
      [{ id: "o1", name: "Old", terms: "50% off", active: true, revision: 1, expires_at: PAST }]
    );
    const client = await connect(db);
    const guide = await call(client, "get_brand_guide", { brandId: BRAND });
    expect(guide.approved_claims[0].stale).toBe(false);
    expect(guide.offers[0].stale).toBe(true);
    expect(guide.stale_warning).toMatch(/STALE/);
    const ok = await call(client, "check_brand_copy", { brandId: BRAND, draft: "Every plan has a 30-day money-back guarantee." });
    expect(ok.verdict).toBe("approved");
  });

  it("keeps the replaced version when a claim is edited", async () => {
    const { db, writes } = fakeDb([{ id: "22222222-2222-4222-8222-222222222222", statement: "Old", status: "APPROVED", revision: 1, expires_at: null }], []);
    const client = await connect(db);
    await call(client, "save_approved_claim", { brandId: BRAND, claimId: "22222222-2222-4222-8222-222222222222", statement: "New", expectedRevision: 1 });
    const version = writes.find((w) => w.path === "/rest/v1/claim_fact_versions");
    expect(version?.body).toMatchObject({ revision: 1, snapshot: { statement: "Old" } });
  });
});
