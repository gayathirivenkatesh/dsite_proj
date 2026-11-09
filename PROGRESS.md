# Progress
## Phase status (TODO / IN PROGRESS / DONE)
P1 Foundation: DONE
P2 Auth and RBAC: DONE
P3 Files and storage: DONE
P4 Share links, expiry, password: DONE
P5 Access logs: DONE
P6 Admin, hardening, API docs: DONE
P7 Frontend foundation and design system: DONE
P8 Frontend pages: DONE
P9 Docker, CI, deployment: DONE
P10 Final audit and docs: DONE
## Stack and commands (fill as decided)
- Backend: Node.js (ES modules), Express, MongoDB + Mongoose, Zod 4, argon2, jsonwebtoken, multer, file-type, helmet, cors, hpp, express-rate-limit, cookie-parser
- Frontend: React 19, Vite 6, React Router 7, CSS variables with custom typography
- Testing & Tooling: Vitest 5, Supertest, mongodb-memory-server, ESLint 9, Prettier 3
- Commands:
  - `npm run dev`: start backend development server
  - `npm run client:dev`: start frontend development server
  - `npm run seed`: seed default Admin and User accounts
  - `npm run lint`: run ESLint across all workspaces
  - `npm run format`: format codebase with Prettier
  - `npm run format:check`: verify Prettier formatting
  - `npm run test`: run server tests with Vitest
  - `npm run build --workspace=client`: build frontend bundle
  - `docker compose up --build`: run MongoDB, API, and Web in containers
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
- Reusable `authenticate` (Bearer JWT) and `authorize(...roles)` middlewares guard protected resources with standard 401 and 403 error formats (roles normalized to uppercase).
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
- AccessLog model schema ({ outcome, ip, userAgent, linkId, fileId, owner, timestamp }) with compound indexes for owner and resource lookups.
- Logging resilience: `accessLogService.record` wraps DB operations in try/catch to guarantee logging never breaks the request flow.
- Secrets strictly excluded from AccessLog schema and logging calls (no passwords, tokens, or token hashes stored).
- Outbound outcomes: `success`, `wrong_password`, `expired`, `exhausted`, `revoked`, `not_found`, and `rate_limited`.
- Owner endpoints for logs per file (`GET /api/v1/files/:id/logs`) and per link (`GET /api/v1/links/:id/logs`) enforce owner-scoping (404 on IDOR attempts) with pagination and outcome filtering.
- Admin endpoints behind `authorize('ADMIN')` (list/disable users, list all files, delete any file, revoke any link, view all audit logs).
- Account disablement: Admin can enable/disable users; disabled accounts are immediately blocked at login, refresh, and getMe endpoints with all active refresh tokens purged.
- Self-disable prevention: Admin accounts cannot disable themselves to prevent administrative lockouts.
- Global administrative file deletion removes the stored binary, cleans up all associated share links, and deletes the file record.
- Global administrative share link revocation instantly invalidates public access (returns 410 on subsequent download attempts).
- Database seed script (`server/src/scripts/seed.js`) provides idempotent creation of default Admin (`admin@vault.local`) and standard User (`user@vault.local`).
- Multi-stage non-root Dockerfiles configured for server (API) and client (NGINX web) with `docker-compose.yml` for unified local execution.
- Comprehensive documentation created in `README.md`, `docs/API.md`, `SECURITY.md`, and `docs/CHECKLIST.md`.
- Full audit completed: all 95 tests passing, ESLint 0 errors, Prettier verified, 0 npm audit vulnerabilities, no committed secrets.
- Extended user registration schema and User model with optional `name` field (max 100 characters) to support UI registration forms, admin search by name/email, and display name fallbacks.
- Enhanced file rename validation to accept both `name` and `originalName` parameters with automated transform.
## Known issues / tech debt
- None. `npm audit` reports 0 vulnerabilities. All test suites passing.
## NEXT STEP (exact, specific)
- All 10 phases completed and verified. System is ready for production evaluation, container deployment, or GitHub submission.
## Last updated: 09 Nov 2026, Post-audit fix for user registration schema
