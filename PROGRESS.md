# Progress
## Phase status (TODO / IN PROGRESS / DONE)
P1 Foundation: DONE
P2 Auth and RBAC: DONE
P3 Files and storage: TODO
P4 Share links, expiry, password: TODO
P5 Access logs: TODO
P6 Admin, hardening, API docs: TODO
P7 Frontend foundation and design system: TODO
P8 Frontend pages: TODO
P9 Docker, CI, deployment: TODO
P10 Final audit and docs: TODO
## Stack and commands (fill as decided)
- Backend: Node.js (ES modules), Express, MongoDB + Mongoose, Zod 4, argon2, jsonwebtoken, helmet, cors, hpp, express-rate-limit, cookie-parser
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
## Known issues / tech debt
- None. `npm audit` reports 0 vulnerabilities.
## NEXT STEP (exact, specific)
P3 Files and storage: Implement File model with owner scoping, storage abstraction (local disk implementation in server/src/storage/), upload endpoint with size limit and type allowlist checking extension AND magic bytes, streamed download with Content-Disposition attachment + nosniff, file delete and list endpoints, and owner-scoped queries (IDOR prevention) with automated tests.
## Last updated: 06 Nov 2026, P2 Auth and RBAC
