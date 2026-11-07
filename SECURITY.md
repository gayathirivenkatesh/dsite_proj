# Security Policy & Architecture

## Security Philosophy

The **Secure File Sharing Vault** is designed with defense-in-depth principles where security, correctness, and data confidentiality outrank UI convenience. Every resource is protected by multiple independent verification layers, ensuring that failures in any single boundary do not compromise the integrity of the vault.

---

## 1. Authentication & Session Management

- **Access Tokens**: Short-lived (15 minutes) JSON Web Tokens signed using a cryptographically strong secret.
- **Fixed Algorithm**: The JWT verification strictly enforces the `HS256` algorithm to prevent algorithm downgrade attacks (e.g. `none` algorithm exploits).
- **Refresh Token Rotation**:
  - Refresh tokens are 40-byte cryptographically random hex strings (`crypto.randomBytes(40)`).
  - Only the **SHA-256 hash** of the refresh token is stored in the database (`tokenHash`).
  - Refresh tokens are transmitted exclusively in `httpOnly`, `Secure`, `SameSite=lax` cookies scoped to `/api/v1/auth`.
  - Every `/refresh` request issues a new token pair and revokes the previous refresh token.
  - Server-side revocation ensures tokens can be invalidated immediately upon `/logout` or administrative disablement.
- **Generic Login Errors & Timing Mitigation**:
  - Login returns identical generic error messages (`Invalid email or password`) regardless of whether the email exists.
  - When an email is not found, a dummy `argon2id` verification is performed using a pre-computed hash to equalize response times and prevent user enumeration timing attacks.

---

## 2. Password Hashing & Cryptography

- **Argon2id**: Passwords (user accounts and share link passwords) are hashed using `argon2id` with OWASP-recommended parameters:
  - **Memory Cost**: 64 MB (`m=65536`)
  - **Time Cost / Iterations**: 3 iterations (`t=3`)
  - **Parallelism**: 1 thread (`p=1`)
  - Highly resistant against GPU, FPGA, and ASIC brute-force attacks.
- **Share Link Tokens**:
  - Generated using `crypto.randomBytes(40).toString('hex')` (320 bits of entropy).
  - Stored exclusively as SHA-256 hashes (`tokenHash`). Raw tokens are returned to the client once upon link creation and never persisted.
- **Storage Keys**:
  - Storage keys are randomized 24-byte hex strings (`crypto.randomBytes(24)`), completely decoupled from user-supplied filenames.

---

## 3. Authorization & IDOR Prevention

- **Role-Based Access Control (RBAC)**:
  - Distinct `USER` and `ADMIN` roles enforced via `authorize('ADMIN')`.
  - Registration payloads strictly reject the `role` attribute; user role is always hardcoded to `USER` server-side.
- **Strict Owner-Scoping (Zero IDOR)**:
  - All file, link, and log access queries are strictly scoped by `{ _id: id, owner: req.user.id }`.
  - Unauthorized access attempts return `404 Not Found` (rather than `403 Forbidden`) to prevent leaking the existence of other users' resources.
- **Account Disablement**:
  - When an administrator disables an account (`isDisabled: true`), all active refresh tokens are immediately purged, and login, refresh, and profile endpoints are blocked.
  - Admins cannot disable their own accounts, preventing self-lockout.

---

## 4. File Storage & Upload Security

- **Dual-Layer File Validation**:
  - **Extension Allowlist**: Only explicitly allowed extensions (`jpg`, `jpeg`, `png`, `gif`, `webp`, `pdf`, `zip`, `txt`, `csv`, `json`) are permitted.
  - **Magic Byte Verification**: File binary headers are inspected via `file-type` to detect and reject MIME/extension spoofing (e.g. an `.exe` disguised as `.png`).
  - **Path Traversal & Control Characters**: Filenames are sanitized using null-byte scanning (`\0`), control character stripping, directory separator removal, and `path.basename()`.
- **Decoupled Storage**:
  - Stored files reside outside public web roots with random hex keys.
  - Storage driver enforces canonical path resolution (`resolveSafePath()`) to block directory traversal attacks (`../`).
- **Download Hardening**:
  - Served with `Content-Disposition: attachment; filename="..."; filename*=UTF-8''...` (RFC 5987 encoded).
  - Enforced `X-Content-Type-Options: nosniff` header prevents browser MIME-sniffing execution.
  - Downloads are streamed chunk-by-chunk to avoid unbounded memory consumption.

---

## 5. Share Links, Atomic Expiry & Race-Condition Safety

- **Atomic Quota Enforcement (Key Challenge A)**:
  - Expiry by download quota is enforced on the database engine level using a single atomic conditional `findOneAndUpdate` with `$inc: { downloadCount: 1 }`.
  - Filter combines time expiry and max downloads:
    ```javascript
    {
      tokenHash,
      isRevoked: false,
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        { $or: [{ maxDownloads: null }, { $expr: { $lt: ['$downloadCount', '$maxDownloads'] } }] },
      ],
    }
    ```
  - Eliminates check-then-act race conditions; concurrent downloads racing for the final slot yield exactly one success.
- **Password Protection (Key Challenge B)**:
  - Link passwords are verified via `POST` in the request body (never in URLs, query strings, or server access logs).
  - Metadata is hidden until the password is verified.
  - **Brute-Force Lockout**: 5 failed password attempts from an IP within a 1-hour rolling window trigger an automatic 15-minute temporary lockout (`429 Too Many Requests`).

---

## 6. Audit Logging & System Hardening

- **Access Log Audit Trail (Key Challenge C)**:
  - Every public access attempt records: outcome (`success`, `wrong_password`, `expired`, `exhausted`, `revoked`, `not_found`, `rate_limited`), timestamp, IP address, User-Agent, `linkId`, and `fileId`.
  - Logging is completely non-blocking and isolated in `try...catch` so log persistence errors never disrupt request handling.
  - Secrets (passwords, tokens, token hashes) are strictly excluded from all logs.
- **HTTP Hardening**:
  - `Helmet`: Sets secure HTTP headers and removes `X-Powered-By`.
  - `CORS`: Strict origin allowlist parsed from environment configuration.
  - `HPP`: Prevents HTTP Parameter Pollution attacks.
  - `NoSQL Injection Sanitizer`: Recursively strips MongoDB operator keys starting with `$` and keys containing dots (`.`) from `req.body`, `req.query`, and `req.params`.
  - `Rate Limiting`: IP-based rate limiting on all API routes with strict limits on authentication endpoints.
  - `Trust Proxy`: Express configured with `trust proxy: 1` for accurate client IP resolution behind reverse proxies.

---

## 7. Reporting a Vulnerability

If you discover a potential security vulnerability in this project:
1. Do **NOT** open a public issue on GitHub.
2. Email full reproduction details to `security@vault.local`.
3. Provide sample payloads, steps to reproduce, and potential impact.
4. The security team will acknowledge receipt within 24 hours and provide a remediation timeline.
