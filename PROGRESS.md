# Progress
## Phase status (TODO / IN PROGRESS / DONE)
P1 Foundation: DONE
P2 Auth and RBAC: DONE
P3 Files and storage: DONE
P4 Share links, expiry, password: DONE
P5 Access logs: TODO
P6 Admin, hardening, API docs: TODO
P7 Frontend foundation and design system: TODO
P8 Frontend pages: TODO
P9 Docker, CI, deployment: TODO
P10 Final audit and docs: TODO
## Stack and commands (fill as decided)
- Backend: Node.js (ES modules), Express, MongoDB + Mongoose, Zod 4, argon2, jsonwebtoken, multer, file-type, helmet, cors, hpp, express-rate-limit, cookie-parser
- Frontend: React 19, Vite 6, React Router 7, CSS variables with custom typography
- Testing & Tooling: Vitest 5, Supertest, mongodb-memory-server, ESLint 9, Prettier 3
- Commands:
  - `npm run dev`: start backend development server
  - `npm run client:dev`: start frontend development server
  - `npm run lint`: run ESLint across all workspaces
  - `npm run format:check`: verify Prettier formatting
  - `npm run test`: run server tests with Vitest
  - `npm run build --workspace=client`: build frontend bundle
## Decisions
- Kept root directory at `d:\dsite_proj` with npm workspaces `server` and `client`.
- Express app factory (`createApp`) in `server/src/app.js` is isolated from the network listener in `server/src/server.js` for fast, decoupled Supertest integration testing.
- Zod schema validates all environment variables at startup and terminates immediately with formatted errors if invalid.
- Central error handler enforces `{ error: { code, message, details } }` format across all routes, preventing stack trace leaks.
- Zero-dependency recursive sanitizer cleans NoSQL operators (`$*` and `.*`) from `req.body`, `req.query`, and `req.params`.
- Prettier ignores `.md` files to maintain exact requirements formatting.
- Password hashing uses argon2id with OWASP-recommended parameters (64MB memory cost, 3 iterations) for high resistance against GPU/ASIC attacks.
- Access tokens use a short 15-minute lifetime with fixed HS256 algorithm enforcement.
- Refresh tokens are cryptographically random 40-byte strings, stored as SHA-256 hashes in MongoDB, delivered in httpOnly, SameSite=lax cookies scoped to `/api/v1/auth`.
- Token rotation on every refresh: invalidates previous token, issues new pair, and guards against reuse attacks.
- Dummy argon2 verify call executed when email does not exist to eliminate user enumeration timing attacks.
- Strict Zod whitelisting prevents mass assignment of sensitive fields such as `role`.
- Reusable `authenticate` (Bearer JWT) and `authorize(...roles)` middlewares guard protected resources with standard 401 and 403 error formats.
- `mongodb-memory-server` configured for isolated, reproducible automated integration tests without external database dependencies.
- Storage abstraction created via `BaseStorage` and `LocalStorageDriver`, safely resolving disk paths outside public web roots and blocking directory traversal.
- Dual-layer file validation: extension allowlist checked and verified against binary magic bytes using `file-type` and null-byte scanners.
- User filenames are sanitized (stripping directory traversal, null bytes, control characters, leading/trailing dots) and preserved solely as metadata; disk storage filenames use random 24-byte hex strings.
- Strict owner-scoping on all file operations (`{ _id: fileId, owner: req.user.id }`), returning 404 on IDOR attempts to prevent leaking file existence.
- File downloads streamed with `Content-Disposition: attachment` (RFC 5987 encoded) and `X-Content-Type-Options: nosniff` preventing browser MIME execution.
- Share link tokens: crypto.randomBytes(40) URL-safe, only SHA-256 hash stored in DB; raw token returned once at creation.
- Atomic `findOneAndUpdate` with `$and` and dual `$or` conditions (time expiry + count limit) used for download enforcement. A bare JS object cannot hold two `$or` keys — the second silently overwrites the first; the fix is `$and: [ {$or: [...]}, {$or: [...]} ]`.
- IP-based lockout for password unlock: 5 failed attempts within a 1-hour rolling window -> 15-minute lockout stored in the link document's `failedAttempts` embedded array.
- `getPublicMetadata` hides file info (name, size, mimeType) entirely when link is password-protected.
- `tokenHash`, `passwordHash`, and `failedAttempts` stripped from all toJSON serializations.
- Public download endpoint supports GET for unprotected files and POST with `{ password }` in the request body for protected links — passwords are never accepted in URL/query strings.
- Concurrency test fires 10 parallel requests at a `maxDownloads: 1` link and asserts exactly 1 returns 200 and 9 return 410.
## Known issues / tech debt
- None. `npm audit` reports 0 vulnerabilities.
## NEXT STEP (exact, specific)
P5 Access logs: Implement AccessLog model ({ outcome, timestamp, ip, userAgent, linkId, fileId, reason }), log every download success and failure without logging passwords or tokens, ensure logging failures never break requests, owner endpoints for logs per file/link (paginated), admin endpoint for all logs (paginated), and comprehensive integration tests.
## Last updated: 07 Nov 2026, P4 Share links, expiry, password
