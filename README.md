# Secure File Sharing Vault

A production-grade, security-hardened full-stack application for private file storage and time- or download-limited sharing links. Built with Node.js, Express, MongoDB, and React (Vite).

---

## Architecture & Features

- **Authentication & RBAC**:
  - OWASP-grade password hashing with **argon2id** (64MB memory cost, 3 iterations).
  - Short-lived HS256 access JWTs (15 min) kept in memory (no `localStorage`).
  - Cryptographically random (40-byte) refresh tokens stored as SHA-256 hashes in MongoDB, delivered via `httpOnly`, `SameSite=lax` secure cookies with server-side revocation and automatic rotation on every refresh.
  - Role-Based Access Control (`USER` and `ADMIN`).
  - Protection against user enumeration via constant-time dummy argon2 verification.
- **File Management & Storage**:
  - Storage abstraction (`BaseStorage` and `LocalStorageDriver`), readily extensible for AWS S3.
  - Dual-layer upload validation: extension allowlist + binary magic byte inspection via `file-type`.
  - Non-executable disk storage with random 24-byte hex identifiers located outside public web directories.
  - Strict owner-scoping across all file operations returning 404 on IDOR attempts to prevent leaking document existence.
  - Streamed downloads with `Content-Disposition: attachment` (RFC 5987 UTF-8 encoded) and `X-Content-Type-Options: nosniff`.
- **Atomic Share Links**:
  - Crypto-random 40-byte URL-safe tokens, stored exclusively as SHA-256 hashes in MongoDB.
  - Expiry by time and/or download count.
  - **Atomic race-safe download enforcement**: single `findOneAndUpdate` using `$and` and dual `$or` conditions with `$inc: { downloadCount: 1 }` prevents concurrent race conditions on the last remaining download.
  - Automated concurrency test verifying parallel requests under load.
  - Optional argon2 password protection with metadata hiding and 15-minute IP-based lockout after 5 consecutive failures.
- **Immutable Access History**:
  - Audit logging for every access attempt (`success`, `wrong_password`, `expired`, `exhausted`, `revoked`, `not_found`, `rate_limited`).
  - Owner endpoints per file and per link with outcome filtering, plus administrative global audit views.
  - Fail-safe logging architecture that never breaks request flows and strictly omits secrets.
- **Admin Governance**:
  - User disablement with instant refresh token revocation and self-disable protection.
  - Global file inspection and administrative purging across all tenants.
  - Administrative link revocation.
- **DevOps & Security Hardening**:
  - Multi-stage, non-root Dockerfiles for backend API and frontend NGINX web client.
  - One-command orchestration via `docker-compose.yml` (API, Web, MongoDB with volume).
  - GitHub Actions CI (install, lint, test, build).
  - Helmet security headers, NoSQL query sanitisation, HPP parameter pollution protection, strict CORS origin allowlists, body limits, and multi-tier rate limiting.

---

## Quick Start (Local Development)

### Prerequisites

- Node.js >= 20
- npm >= 10
- MongoDB instance (or Docker)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd dsite_proj

# Install dependencies across all workspaces
npm install

# Set up environment variables
cp .env.example .env
cp client/.env.example client/.env
```

### Database Seeding

Seed default Admin and User credentials:

```bash
npm run seed
```

Default seeded credentials:
- **Admin**: `admin@vault.local` / `Admin@Vault123!`
- **User**: `user@vault.local` / `User@Vault123!`

### Running Development Servers

```bash
# Start backend Express server (port 5000)
npm run server:dev

# In a separate terminal, start frontend Vite client (port 5173)
npm run client:dev
```

Open `http://localhost:5173` in your browser.

---

## Running with Docker Compose

To run the entire system (MongoDB, API server, and NGINX frontend) with a single command:

```bash
docker compose up --build
```

- **Web Frontend**: `http://localhost:80`
- **Backend API**: `http://localhost:3000`
- **MongoDB**: `localhost:27017`

To run in detached background mode:
```bash
docker compose up -d
```

To stop:
```bash
docker compose down
```

---

## Testing & Quality Assurance

```bash
# Run integration tests (Vitest with in-memory MongoDB)
npm test

# Run ESLint across client and server
npm run lint

# Verify Prettier formatting
npm run format:check

# Run production frontend build
npm run build --workspace=client
```

---

## Deployment Guides

### 1. Backend: Render / Railway

#### Render (Web Service)
1. Connect repository and select the `server` directory as the Root Directory (or use root Docker build).
2. Set Environment to **Node** or **Docker**.
   - If Node: Build command: `npm install --workspace=server`, Start command: `npm start --workspace=server`.
   - If Docker: Dockerfile path: `server/Dockerfile`.
3. Set Required Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000` (or leave default assigned by Render)
   - `MONGODB_URI`: MongoDB connection string (e.g. MongoDB Atlas)
   - `CORS_ORIGIN`: Your deployed frontend URL (e.g. `https://vault-app.vercel.app`)
   - `JWT_SECRET`: Random 32+ character secret string
   - `REFRESH_SECRET`: Random 32+ character secret string
   - `UPLOAD_DIR`: `uploads` (or persistent disk mount)

#### Railway
1. New Project -> Deploy from GitHub repo -> select repository.
2. In Service Settings, set Root Directory to `/server` or use root `docker-compose.yml`.
3. Add a MongoDB plugin or external Atlas URI.
4. Set required variables (`NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `REFRESH_SECRET`, `CORS_ORIGIN`).

### 2. Frontend: Vercel / Netlify

#### Vercel
1. Import repository and set Root Directory to `client`.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Environment Variables:
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://vault-api.onrender.com`).

#### Netlify
1. Add new site from Git.
2. Base directory: `client`.
3. Build command: `npm run build`.
4. Publish directory: `client/dist`.
5. Environment Variables:
   - `VITE_API_URL`: Your deployed backend URL.

---

## Environment Variables Reference

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP listening port | `5000` |
| `NODE_ENV` | Application environment mode | `development` / `production` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://127.0.0.1:27017/secure_vault` |
| `CORS_ORIGIN` | Allowed client origin for CORS | `http://localhost:5173` |
| `JWT_SECRET` | 32+ character key for HS256 access tokens | Required |
| `REFRESH_SECRET` | 32+ character key for refresh tokens | Required |
| `UPLOAD_DIR` | Directory for uploaded files | `uploads` |
| `MAX_FILE_SIZE_BYTES` | Maximum upload size in bytes | `52428800` (50MB) |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Max requests per rate limit window | `100` |
| `VITE_API_URL` | Frontend API client base URL | `http://localhost:5000` |

---

## Project Structure

```
dsite_proj/
├── .github/workflows/ci.yml       # GitHub Actions CI workflow
├── docker-compose.yml             # Local production compose stack
├── .dockerignore                  # Docker ignore patterns
├── .env.example                   # Backend environment template
├── docs/
│   ├── BRIEF.md                   # Assessment requirements
│   ├── API.md                     # REST API reference
│   └── CHECKLIST.md               # Requirement verification audit
├── SECURITY.md                    # Security architecture & disclosures
├── PROGRESS.md                    # Phase progression log
├── server/
│   ├── Dockerfile                 # Non-root multi-stage API build
│   └── src/
│       ├── config/                # Environment validation & DB
│       ├── controllers/           # Thin route controllers
│       ├── middlewares/           # Auth, RBAC, error, rate limit, sanitize
│       ├── models/                # User, File, ShareLink, AccessLog
│       ├── routes/                # Modular REST route endpoints
│       ├── scripts/               # Idempotent seed script
│       ├── services/              # Business logic & atomic operations
│       ├── storage/               # Local driver & storage abstraction
│       └── utils/                 # Crypto, JWT, logger, file validation
└── client/
    ├── Dockerfile                 # Non-root multi-stage NGINX build
    ├── .env.example               # Frontend environment template
    └── src/
        ├── api/                   # Fetch client with refresh interceptor
        ├── components/            # Accessible design system components
        ├── features/              # AuthContext & ToastContext
        ├── pages/                 # Dashboard, PublicDownload, Admin, Auth
        ├── routes/                # Protected & role-based route guards
        └── styles/                # CSS variables, dark/light theme tokens
```
