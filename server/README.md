# Vlackjack Backend (Milestone 1)

FastAPI service providing authentication, JWT sessions, and profile management (including avatar upload).

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and adjust values as needed.

## Demo Users

Seed demo admin/player accounts after running migrations:

```powershell
python -m app.scripts.seed_demo
```

Demo credentials:

- Admin: `admin@vlackjack.test` / `DemoAdmin123!`
- Player: `player@vlackjack.test` / `DemoPlayer123!`

## Database

PostgreSQL stores core data. Redis is used for cache/session storage and the Socket.IO manager.

```powershell
alembic upgrade head
```

## Run

```powershell
uvicorn app.main:app --reload
```

## Realtime (Socket.IO)

Socket.IO uses the access token from `/api/auth/login` for authentication. Connect with:

- `auth: { token: "<access-token>" }`
- Events: `lobby:list`, `table:create`, `table:join`, `table:leave`, `table:ready`, `game:sync`, `game:start`, `game:action`
- Server pushes: `lobby:snapshot`, `table:state`, `table:joined`, `table:error`, `game:state`, `game:error`

## Endpoints

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/profile`
- `PUT /api/profile`
- `POST /api/profile/avatar`
- `GET /api/wallet`
- `PUT /api/wallet/link`
- `GET /api/admin/overview`
- `GET /api/admin/users`
- `PATCH /api/admin/users/{user_id}`
- `POST /api/admin/users/{user_id}/sessions/revoke`
- `POST /api/admin/users/{user_id}/wallet/adjust`
- `GET /uploads/...`

Admin endpoints require an account with `is_admin=true`.
