# Secure File Sharing Vault — REST API Reference

Base URL: `/api/v1`

All responses use standard JSON formatting. Error responses consistently adhere to the following schema:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of the error",
    "details": []
  }
}
```

---

## Table of Contents
1. [Health](#1-health)
2. [Authentication & Profile](#2-authentication--profile)
3. [File Management](#3-file-management)
4. [Share Links (Owner)](#4-share-links-owner)
5. [Public Link Endpoints](#5-public-link-endpoints)
6. [Access Logs](#6-access-logs)
7. [Admin Endpoints](#7-admin-endpoints)

---

## 1. Health

### `GET /health` or `GET /api/v1/health`
Checks server availability and operational health.
- **Authentication**: None
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2026-11-07T20:55:00.000Z"
}
```

---

## 2. Authentication & Profile

### `POST /api/v1/auth/register`
Creates a new user account. Role is hardcoded to `USER`.
- **Authentication**: None
- **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "user@example.com",
  "password": "Password1!"
}
```
*Note: `name` is optional (max 100 characters).*
- **Response**: `201 Created`
  - Sets httpOnly `refreshToken` cookie.
```json
{
  "user": {
    "id": "672d24e12c12a8849b291a11",
    "name": "Jane Doe",
    "email": "user@example.com",
    "role": "USER",
    "isDisabled": false,
    "createdAt": "2026-11-07T20:55:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### `POST /api/v1/auth/login`
Authenticates a user with email and password.
- **Authentication**: None
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "Password1!"
}
```
- **Response**: `200 OK`
  - Sets httpOnly `refreshToken` cookie.
```json
{
  "user": {
    "id": "672d24e12c12a8849b291a11",
    "email": "user@example.com",
    "role": "USER",
    "isDisabled": false
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### `POST /api/v1/auth/refresh`
Rotates the refresh token and issues a new access token.
- **Authentication**: `refreshToken` httpOnly cookie
- **Response**: `200 OK`
  - Sets new httpOnly `refreshToken` cookie.
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### `POST /api/v1/auth/logout`
Revokes the current refresh token and clears the cookie.
- **Authentication**: `refreshToken` httpOnly cookie
- **Response**: `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

### `GET /api/v1/users/me`
Retrieves authenticated user profile.
- **Authentication**: `Bearer <accessToken>`
- **Response**: `200 OK`
```json
{
  "user": {
    "id": "672d24e12c12a8849b291a11",
    "email": "user@example.com",
    "role": "USER",
    "isDisabled": false
  }
}
```

---

## 3. File Management

### `POST /api/v1/files`
Uploads a file with dual-layer extension and magic byte verification.
- **Authentication**: `Bearer <accessToken>`
- **Content-Type**: `multipart/form-data`
- **Form Field**: `file` (binary)
- **Response**: `201 Created`
```json
{
  "file": {
    "id": "672d25032c12a8849b291a25",
    "originalName": "contract.pdf",
    "mimeType": "application/pdf",
    "size": 1048576,
    "owner": "672d24e12c12a8849b291a11",
    "createdAt": "2026-11-07T20:55:00.000Z"
  }
}
```

### `GET /api/v1/files`
Lists files owned by the authenticated user (paginated).
- **Authentication**: `Bearer <accessToken>`
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20, max: 100)
- **Response**: `200 OK`
```json
{
  "files": [
    {
      "id": "672d25032c12a8849b291a25",
      "originalName": "contract.pdf",
      "mimeType": "application/pdf",
      "size": 1048576,
      "createdAt": "2026-11-07T20:55:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### `GET /api/v1/files/:id`
Retrieves metadata for an owned file.
- **Authentication**: `Bearer <accessToken>`
- **Response**: `200 OK`

### `PATCH /api/v1/files/:id`
Renames an owned file.
- **Authentication**: `Bearer <accessToken>`
- **Request Body**:
```json
{
  "originalName": "contract-final.pdf"
}
```
- **Response**: `200 OK`

### `DELETE /api/v1/files/:id`
Permanently deletes an owned file, its storage binary, and associated share links.
- **Authentication**: `Bearer <accessToken>`
- **Response**: `200 OK`
```json
{
  "message": "File deleted successfully"
}
```

### `GET /api/v1/files/:id/download`
Streams direct file download for the file owner.
- **Authentication**: `Bearer <accessToken>`
- **Response**: Binary stream with headers:
  - `Content-Disposition: attachment; filename="..."; filename*=UTF-8''...`
  - `X-Content-Type-Options: nosniff`

---

## 4. Share Links (Owner)

### `POST /api/v1/links`
Generates a new share link for an owned file. Returns raw token **once**.
- **Authentication**: `Bearer <accessToken>`
- **Request Body**:
```json
{
  "fileId": "672d25032c12a8849b291a25",
  "expiresAt": "2026-11-14T20:55:00.000Z",
  "maxDownloads": 5,
  "password": "OptionalPassword123"
}
```
- **Response**: `201 Created`
```json
{
  "link": {
    "id": "672d254b2c12a8849b291a32",
    "file": "672d25032c12a8849b291a25",
    "owner": "672d24e12c12a8849b291a11",
    "expiresAt": "2026-11-14T20:55:00.000Z",
    "maxDownloads": 5,
    "downloadCount": 0,
    "isPasswordProtected": true,
    "status": "ACTIVE"
  },
  "token": "4a7f8e12b9c034..."
}
```

### `GET /api/v1/links`
Lists share links created by the authenticated owner.
- **Authentication**: `Bearer <accessToken>`
- **Query Parameters**: `page`, `limit`, `fileId` (optional filter)
- **Response**: `200 OK`

### `DELETE /api/v1/links/:id`
Revokes an owned share link immediately.
- **Authentication**: `Bearer <accessToken>`
- **Response**: `200 OK`

---

## 5. Public Link Endpoints

### `GET /api/v1/links/public/:token`
Retrieves public link metadata. If password-protected, file details (`name`, `size`) are hidden until unlocked.
- **Authentication**: None
- **Response**: `200 OK`
```json
{
  "id": "672d254b2c12a8849b291a32",
  "status": "ACTIVE",
  "isPasswordProtected": true,
  "expiresAt": "2026-11-14T20:55:00.000Z",
  "maxDownloads": 5,
  "downloadCount": 0,
  "createdAt": "2026-11-07T20:55:00.000Z"
}
```

### `POST /api/v1/links/public/:token/unlock`
Verifies link password and reveals file metadata. Enforces IP lockout after 5 consecutive failures.
- **Authentication**: None
- **Request Body**:
```json
{
  "password": "OptionalPassword123"
}
```
- **Response**: `200 OK`
```json
{
  "file": {
    "originalName": "contract.pdf",
    "mimeType": "application/pdf",
    "size": 1048576
  }
}
```

### `GET /api/v1/links/public/:token/download`
Direct browser download for unprotected links. Returns `401 PASSWORD_REQUIRED` if the link requires a password.
- **Authentication**: None
- **Response**: Binary stream attachment with `nosniff` header.

### `POST /api/v1/links/public/:token/download`
Downloads file via share link. Supports optional `{ password }` in the request body for password-protected links. Enforces atomic conditional download quota decrement.
- **Authentication**: None
- **Request Body**:
```json
{
  "password": "OptionalPassword123"
}
```
- **Response**: Binary stream attachment.

---

## 6. Access Logs

### `GET /api/v1/files/:id/logs`
Owner access history for a specific file.
- **Authentication**: `Bearer <accessToken>`
- **Query Parameters**: `page`, `limit`, `outcome` (optional filter)
- **Response**: `200 OK`
```json
{
  "logs": [
    {
      "id": "672d26112c12a8849b291a54",
      "outcome": "success",
      "ip": "192.168.1.50",
      "userAgent": "Mozilla/5.0...",
      "linkId": "672d254b2c12a8849b291a32",
      "fileId": "672d25032c12a8849b291a25",
      "timestamp": "2026-11-07T20:55:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1 }
}
```

### `GET /api/v1/links/:id/logs`
Owner access history for a specific share link.
- **Authentication**: `Bearer <accessToken>`
- **Query Parameters**: `page`, `limit`, `outcome`
- **Response**: `200 OK`

---

## 7. Admin Endpoints

All admin endpoints require role `ADMIN`.

### `GET /api/v1/admin/health`
Verifies admin privileges.
- **Authentication**: `Bearer <adminAccessToken>`
- **Response**: `200 OK`

### `GET /api/v1/admin/users`
Lists all system users with search and pagination.
- **Authentication**: `Bearer <adminAccessToken>`
- **Query Parameters**: `page`, `limit`, `search` (email filter)
- **Response**: `200 OK`

### `PATCH /api/v1/admin/users/:id/disable`
Disables or enables a user account. Disabling immediately revokes all active refresh tokens.
- **Authentication**: `Bearer <adminAccessToken>`
- **Request Body**:
```json
{
  "isDisabled": true
}
```
- **Response**: `200 OK`

### `GET /api/v1/admin/files`
Lists all files across all users with owner details.
- **Authentication**: `Bearer <adminAccessToken>`
- **Query Parameters**: `page`, `limit`, `search`
- **Response**: `200 OK`

### `DELETE /api/v1/admin/files/:id`
Permanently deletes any file in the system.
- **Authentication**: `Bearer <adminAccessToken>`
- **Response**: `200 OK`

### `DELETE /api/v1/admin/links/:id`
Revokes any share link in the system.
- **Authentication**: `Bearer <adminAccessToken>`
- **Response**: `200 OK`

### `GET /api/v1/admin/logs`
System-wide access log audit trail across all files, links, and users.
- **Authentication**: `Bearer <adminAccessToken>`
- **Query Parameters**: `page`, `limit`, `outcome`, `fileId`, `linkId`
- **Response**: `200 OK`

