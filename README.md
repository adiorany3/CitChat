# ChatSecrets — Vercel edition

Next.js App Router + TypeScript, native Node AES-256-GCM, Upstash Redis REST. No Streamlit, filesystem storage, custom WebSocket server, or extra runtime SDK. Adapted from https://github.com/adiorany3/ChatSecrets; independent implementation, no existing JSON/Fernet data migration.

## Run locally

Use Node.js 22 LTS or newer.

```sh
cd chatsecrets-vercel
npm install
cp .env.example .env.local
openssl rand -hex 32
```

Create an Upstash Redis database. Fill `.env.local` with its `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and the generated `APP_SECRET`. Never expose these using `NEXT_PUBLIC_` or commit them. Then:

```sh
npm run dev
```

Open http://localhost:3000. Test two participants using separate browser profiles/incognito sessions. One HttpOnly cookie session per browser profile; multiple tabs share that session.

## Deploy on Vercel

1. Push this project to your Git repository. If pushing the parent directory, select `chatsecrets-vercel` as Vercel's Root Directory.
2. Import the repository into Vercel; framework preset: Next.js. Default build command: `npm run build`.
3. Create/connect Upstash Redis through Vercel Marketplace or Upstash directly.
4. Add `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `APP_SECRET` to Vercel environment variables. Use separate databases/secrets for Preview and Production.
5. Deploy. Redeploy after changing environment variables.

Vercel's filesystem is not persistent shared storage. Redis is required; there is deliberately no misleading in-memory production fallback.

## Behavior

- Create/join case-sensitive named rooms; random room generation and fragment-based invite links.
- Username and room fixed while joined. Reload allows another join.
- Chat, ping, optional browser-generated sound, WIB timestamps, online presence.
- Poll every 3 seconds while visible; presence expires after 30 seconds without a heartbeat.
- Confirmed panic destruction deletes room messages and presence atomically for all participants. Any participant may destroy; no separate destroy-code mode.
- Name reuse lock: 30 seconds, matching current upstream source (upstream README mentions 10 minutes).
- Generation IDs invalidate sessions from destroyed/expired rooms even after name reuse.
- Latest 200 messages retained; inactive rooms expire after 24 hours. Sessions last 24 hours.
- Lua scripts serialize concurrent join/send/destroy operations. Rate limit: 90 requests per minute per session, joins per IP per room. For public high-traffic deployments, add Vercel Firewall global/IP limits; per-room limits alone do not prevent distributed abuse.

## Security and limits

Messages and presence are encrypted in Redis with AES-256-GCM. This is **not end-to-end encryption**: the server can decrypt content. Room names act as shared access secrets; anyone knowing a name can join, read, and destroy. Generate unpredictable names, share privately, use HTTPS. Usernames are aliases, not verified identities. No account authentication or recovery.

Secrets remain server-side; sessions use authenticated encryption and HttpOnly, SameSite cookies. Requests validate origins and input sizes. React renders chat as text, not HTML. Responses disable caching. Do not rotate `APP_SECRET` while preserving existing room data: old ciphertext becomes unreadable.

Deletion removes active Redis keys, not screenshots, provider backups, or infrastructure logs. No claim of forensic erasure. This app does not log message bodies. Review provider retention policies before handling sensitive content.

Polling consumes Redis commands and Vercel invocations. No attachments, historical archive, or migration of Streamlit data.

## Checks

```sh
npm test
npm run build
npm run check
```

Encryption/validation tests use Node's built-in test runner. Live multi-user testing requires configured Redis; no credentials included.
