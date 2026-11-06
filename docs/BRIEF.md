Stack: Node.js + Express (ES modules), MongoDB + Mongoose, React (Vite),
Zod validation, argon2 hashing, JWT, Vitest/Jest + Supertest, ESLint +
Prettier, Docker + docker-compose (api, web, mongo), GitHub Actions CI
(install, lint, test, build). Deploy: Render/Railway (backend),
Vercel/Netlify (frontend). Must also run locally with Docker.

Features: register/login with JWT; upload files; dashboard to view/manage
own files; generate share links for any owned file and revoke anytime;
public download page (receiver needs no login); roles Admin and User with
proper authorisation; clean REST API with validation and meaningful errors.

Key challenges (most closely evaluated):
A. Expiry by time and/or max download count, enforced on the server. Two
   simultaneous requests for the last allowed download must yield exactly one
   success: use one atomic conditional findOneAndUpdate with $inc, never
   read-check-write. Automated concurrency test required. Codes: 404 unknown,
   410 expired/exhausted/revoked, 401 password required/wrong, 429 limited.
B. Optional link password: hashed (argon2), verified via POST (never in URL),
   file not served and metadata hidden until verified, failed attempts
   rate-limited per link and IP with temporary lockout.
C. Access log: every success AND failure (outcome, time, IP, user-agent,
   linkId, fileId). Owner views per file/per link, paginated; admin views
   all. Never log passwords or tokens; logging must not break requests.

Security: short-lived access JWT (~15 min) + rotating refresh token in
httpOnly Secure SameSite cookie with server-side revocation; secrets from
env and fail-fast at startup; fixed JWT algorithm; generic login errors;
auth rate limiting; owner-scoped queries (no IDOR) with tests; role never
taken from request body; mass-assignment blocked by Zod whitelists; share
tokens = crypto.randomBytes(32+) URL-safe, only SHA-256 hash stored; upload
size limit and type allowlist checking extension AND magic bytes; random
storage filenames outside any public dir; path traversal prevented;
Content-Disposition attachment + nosniff; streamed downloads; storage
abstraction (local disk now, S3-ready); helmet, strict CORS allowlist, rate
limits, body limits, NoSQL-injection sanitising, hpp, no x-powered-by,
correct trust proxy; central error handler with consistent JSON shape and no
stack traces; Docker non-root multi-stage; npm audit clean; SECURITY.md.

API: /api/v1, resource-oriented. Auth (register, login, refresh, logout),
users/me, files CRUD + download, links create/list/revoke, logs per
file/link, public link endpoints (metadata, unlock, download), admin
endpoints (users, files, logs). Error shape:
{ "error": { "code": "...", "message": "...", "details": [] } }.
Paginate lists. Document in docs/API.md or OpenAPI.

Backend layout: server/src/{config,models,routes,controllers,services,
middlewares,validators,utils,storage}. Indexes on link tokenHash, owner,
expiresAt.
Frontend layout: client/src/{api,components,features,hooks,pages,routes,
styles}. One API client with refresh interceptor, protected and role routes,
reusable components, loading/empty/error states everywhere, never use
dangerouslySetInnerHTML.

UI direction "human-era", not generic: vault and envelope metaphor (files =
things you keep, link = a key you hand to someone). Plain, kind microcopy
("This link has been used up", not "403"). Progressive disclosure when
creating links with a plain-language summary ("Works for 7 days or 5
downloads, needs a password"). Status in words plus colour (Active, Expiring
soon, Used up, Expired, Revoked) with natural-language remaining time. One
primary action per screen, large tap targets, mobile-first, generous
whitespace. Risky actions get a confirm dialog stating the consequence.
Access history shown as a readable timeline, raw table as secondary view.
Identity: warm paper-like neutrals, deep ink text, ONE accent colour, soft
shapes, custom SVG lock/key motif, characterful serif headings + humanist
sans body, light/dark via CSS variables, subtle purposeful motion honouring
prefers-reduced-motion. WCAG AA, keyboard navigable, visible focus, semantic
HTML. Avoid: default Tailwind/Bootstrap look, purple gradients,
glassmorphism, stock hero sections. Friendly minimal public download page.

Deliverables: GitHub-ready repo, README (run with/without Docker, env,
tests, deploy steps), SECURITY.md, API docs, .env.example files, seed script
(one Admin, one User), final requirement checklist.
