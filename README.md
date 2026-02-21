# HabitSpace

HabitSpace MVP workspace with:
- `frontend`: React + TypeScript app shell.
- `backend`: Node.js + Express + Prisma API.
- `docs/rulebook.md`: product rules and acceptance criteria.

## Quick Start

### 1) Backend
1. `cd backend`
2. `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`)
3. Set `DATABASE_URL` and `JWT_SECRET` in `.env`.
   Optional for Google login: set `GOOGLE_CLIENT_ID`.
4. `npm install`
5. `npx prisma generate`
6. `npx prisma migrate dev --name init`
7. `npm run dev`

Backend runs on `http://localhost:4000`.

### 2) Frontend
1. `cd frontend`
2. `npm install`
3. Create `frontend/.env` with `VITE_GOOGLE_CLIENT_ID=your_google_web_client_id` (required for Google button).
4. `npm run dev`

Frontend runs on `http://localhost:5173`.

## API Surface (MVP)
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET|POST|PATCH|DELETE /api/habits`
- `POST|PATCH|DELETE /api/habits/:habitId/tasks`
- `POST /api/habits/:habitId/checkins`
- `GET|POST|PATCH|DELETE /api/tracker/tasks`
- `POST /api/tracker/tasks/:taskId/completions`
- `GET /api/dashboard/summary`
- `GET /api/suggestions`
