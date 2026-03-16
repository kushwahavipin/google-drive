# Safe Drive (MySQL Edition)

Google Drive inspired file manager built with React on the frontend and Express + MySQL on the backend.

## What Changed

- Firebase auth/storage/firestore flow was replaced with a MySQL-backed REST API.
- File metadata is persisted in MySQL.
- Uploaded files are stored on disk in `server/uploads` and served by the backend.
- Login now creates/restores a local session user stored in browser local storage and synced to MySQL.

## Tech Stack

- Frontend: React, Vite, Redux Toolkit, styled-components
- Backend: Node.js, Express, MySQL, multer

## Prerequisites

- Node.js 18+
- MySQL 8+

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
copy .env.example .env
```

3. Create the database schema:

```bash
mysql -u root -p < server/schema.sql
```

4. Update `.env` values if your MySQL host/user/password differ.

## Run

- Start frontend + backend together:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000`

## API Endpoints

- `POST /api/auth/login`
- `GET /api/files?userId=<id>`
- `POST /api/files` (multipart form with `file` and `userId`)
- `DELETE /api/files/:id`
- `PATCH /api/files/:id/star`
- `GET /api/trash?userId=<id>`
- `POST /api/trash`
- `DELETE /api/trash/:id`
