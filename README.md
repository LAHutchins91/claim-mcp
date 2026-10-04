# Claim

Claim keeps a brand’s approved claims, current offers, proof, voice, and banned phrases, then lets an assistant read that guide before it writes. A check rejects draft copy that invents a guarantee, invents a discount, uses a banned phrase, or states an offer that is not in the active set.

It works with ChatGPT, Claude, Gemini, Grok, and Cursor, plus any other MCP client that can do Streamable HTTP and OAuth. It is not a ChatGPT-only plugin.

Sign in with your Claim account when the assistant opens OAuth. Do not paste an API key or password into a header. Claim does not accept API keys. Brand tools need Pro or an active trial. The site offers a 14-day trial, then Pro.

The MCP path on a deployment is `/mcp`. Registry metadata is in `server.json` (`io.github.LAHutchins91/claim`).

## What the assistant can do

After you approve the connection, the server exposes these tools:

- list_brands
- create_brand
- get_brand_guide
- save_approved_claim
- save_offer
- save_proof
- save_brand_voice
- save_banned_phrase
- remove_banned_phrase
- check_brand_copy

`check_brand_copy` does not save the draft. Do not deliver copy when its verdict is rejected. Proof shows why a saved claim exists. It does not approve new language. Voice is tone, not permission to invent a promise. The assistant only calls these tools when you and the host allow it.

## Connect

Cursor, in `~/.cursor/mcp.json` or a project `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "claim": {
      "url": "https://YOUR_CLAIM_HOST/mcp"
    }
  }
}
```

Claude Code:

```bash
claude mcp add --transport http claim https://YOUR_CLAIM_HOST/mcp
```

Other clients: add the same URL, choose OAuth, and leave client id and secret empty. Claim supports dynamic client registration. Full steps for each assistant are on the connect page.

## Run

```bash
npm install
npm run build
npm start
```

`npm start` runs `node dist/src/server.js`. When stdin is not a terminal, the process also speaks MCP on stdio so a sandbox can list tools without a token. A terminal keeps the HTTP listener only.

The server starts with empty Supabase and Stripe settings. Discovery (`initialize`, `notifications/initialized`, `tools/list`, and `ping`) does not need a user token. Saving or reading a brand requires a signed-in subscriber.

Copy `supabase/schema.sql` into the Supabase SQL editor before brand tools can read or write. Set these environment variables in the host, not in the repo:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_YEARLY`
- `APP_BASE_URL`
- `PORT`
- `OPENAI_APPS_CHALLENGE` (optional)

Stripe Checkout shows the billing interval and trial before purchase.
