# Progress
## Phase status (TODO / IN PROGRESS / DONE)
P1 Foundation: DONE
P2 Auth and RBAC: TODO
P3 Files and storage: TODO
P4 Share links, expiry, password: TODO
P5 Access logs: TODO
P6 Admin, hardening, API docs: TODO
P7 Frontend foundation and design system: TODO
P8 Frontend pages: TODO
P9 Docker, CI, deployment: TODO
P10 Final audit and docs: TODO
## Stack and commands (fill as decided)
- Backend: Node.js (ES modules), Express, MongoDB + Mongoose, Zod 4, helmet, cors, hpp, express-rate-limit, cookie-parser
- Frontend: React 19, Vite 6, React Router 7, CSS variables with custom typography
- Testing & Tooling: Vitest 5, Supertest, ESLint 9, Prettier 3
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
## Known issues / tech debt
- None. `npm audit` reports 0 vulnerabilities.
## NEXT STEP (exact, specific)
P2 Auth and RBAC: Implement User model with argon2 password hashing, registration and login endpoints, short-lived JWT access token (~15m) + rotating refresh token in httpOnly Secure SameSite cookie with server-side revocation, authentication middleware, role enforcement (Admin, User), and automated auth tests.
## Last updated: 06 Nov 2026, P1 Foundation
