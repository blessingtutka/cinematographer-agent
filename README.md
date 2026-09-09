# Cinematographer Agent

A monorepo containing the **Cinematographer Agent** application: a React and Three.js frontend with
a FastAPI backend for AI-assisted scene analysis, shot planning, and virtual-drone simulation.

The application helps a director move from screenplay text to inspectable camera decisions. A user
creates or selects a project, submits a scene, reviews the AI-generated analysis, chooses up to three
registered virtual drones, generates coverage, and runs the shot plan in the live studio. The studio
shows the director view, camera feeds, simulation state, and in-flight vision updates.

This document describes the project structure and the commands required for:

- Local development
- Dependency management
- Database management
- Alembic migrations
- Testing
- Linting and formatting
- Production builds
- Production database migrations
- Running the frontend and backend
- Environment configuration

---

## 1. Project Structure

```text
cinematographer-agent/
├── apps/
│   ├── api/                         # FastAPI backend
│   │   ├── app/
│   │   │   ├── core/                # Configuration/security
│   │   │   ├── db/                  # Database connection/Base
│   │   │   ├── models/              # SQLAlchemy models
│   │   │   ├── agents/              # Scene, research, vision, and shot-planning agents
│   │   │   ├── routers/              # FastAPI route handlers
│   │   │   ├── drone/                # Virtual drone implementations
│   │   │   ├── simulation/           # Simulation engine and WebSocket streaming
│   │   │   ├── services/            # Business logic
│   │   │   └── main.py              # FastAPI application
│   │   │
│   │   ├── alembic/                 # Database migrations
│   │   │   ├── versions/
│   │   │   ├── env.py
│   │   │   └── script.py.mako
│   │   │
│   │   ├── tests/
│   │   ├── .env
│   │   ├── .env.example
│   │   ├── alembic.ini
│   │   ├── pyproject.toml
│   │   └── uv.lock
│   │
│   └── web/                         # React frontend
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── ...
│
├── packages/
│   └── cinematography-schema/       # Shared Pydantic/domain schemas
├── package.json                     # pnpm/Turbo monorepo scripts
├── README.md
└── .gitignore
```

---

# 2. Requirements

Install the following tools before starting development:

- Python 3.11+
- UV
- Node.js 20+
- pnpm 9+
- PostgreSQL
- Git

Verify:

```bash
python --version
uv --version
node --version
pnpm --version
psql --version
```

---

# 3. Initial Setup

Clone the repository:

```bash
git clone <repository-url>
cd cinematographer-agent
```

Install workspace dependencies:

```bash
pnpm install
```

Install backend dependencies:

```bash
cd ../api
uv sync
```

UV automatically creates and manages:

```text
apps/api/.venv/
```

The virtual environment should **not** be committed.

## Architecture and technology

- **Frontend:** React 19, TypeScript, Vite, React Router, Tailwind CSS, Framer Motion, Three.js,
  and React Three Fiber.
- **Backend:** Python, FastAPI, Uvicorn, Pydantic, SQLAlchemy, Alembic, and PostgreSQL.
- **AI workflow:** Gemini analyzes screenplay scenes and supports vision analysis. The research agent
  uses Parallel Web to retrieve cinematography references before shot planning.
- **Realtime simulation:** The simulation engine runs virtual drones and streams drone state,
  camera activity, and vision events over authenticated WebSockets.
- **Authentication:** JWT access and refresh tokens, email verification, and optional TOTP-based
  two-factor authentication with QR codes.
- **Shared contracts:** `packages/cinematography-schema` contains the domain models shared by the
  API and client-facing types.

---

# 4. Environment Variables

## Backend

Create:

```text
apps/api/.env
```

from:

```text
apps/api/.env.example
```

Example:

```env
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/cinematographer

GEMINI_API_KEY=your-api-key

DEBUG=true
```

Never commit `.env`.

Commit `.env.example` with placeholder values.

---

# 5. Backend Development

Move to the API:

```bash
cd apps/api
```

## Start FastAPI

Recommended with UV:

```bash
uv run uvicorn app.main:app --reload
```

The API will normally be available at:

```text
http://localhost:8000
```

Swagger documentation:

```text
http://localhost:8000/docs
```

ReDoc:

```text
http://localhost:8000/redoc
```

---

# 6. UV Commands

UV manages the Python environment and dependencies.

## Install dependencies

```bash
uv sync
```

## Add a production dependency

```bash
uv add fastapi
```

Example:

```bash
uv add sqlalchemy alembic psycopg2-binary
```

## Add a development dependency

```bash
uv add --dev pytest ruff
```

## Remove a dependency

```bash
uv remove package-name
```

## Update dependencies

```bash
uv lock --upgrade
uv sync
```

## Run a command inside the project environment

```bash
uv run <command>
```

Examples:

```bash
uv run pytest
uv run ruff check .
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

---

# 7. Database

The application uses PostgreSQL.

Example local database:

```text
Database: cinematographer
Host: localhost
Port: 5432
```

Create the database if necessary:

```sql
CREATE DATABASE cinematographer;
```

The database URL is configured through:

```env
DATABASE_URL=...
```

Do not put credentials directly into `alembic.ini`.

---

# 8. SQLAlchemy Models

Database models live under:

```text
apps/api/app/models/
```

Example:

```text
app/models/
├── simulation.py
├── drone.py
└── shot.py
```

Models should inherit from the application's shared SQLAlchemy `Base`.

Example:

```python
class Simulation(Base):
    __tablename__ = "simulations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
```

---

# 9. Alembic

Alembic manages database schema changes.

The migration structure is:

```text
apps/api/
└── alembic/
    ├── versions/
    ├── env.py
    └── script.py.mako
```

`alembic.ini` is located at:

```text
apps/api/alembic.ini
```

---

# 10. Create a Migration

After changing a SQLAlchemy model:

```bash
cd apps/api
```

Generate a migration:

```bash
uv run alembic revision --autogenerate -m "add simulation status"
```

A new file will appear in:

```text
alembic/versions/
```

Example:

```text
alembic/versions/
└── a1b2c3d4_add_simulation_status.py
```

## Important

Always review autogenerated migrations before applying them.

Autogeneration detects many schema changes, but it should never be blindly trusted.

---

# 11. Apply Migrations

Apply all pending migrations:

```bash
uv run alembic upgrade head
```

This is the command used during deployment.

---

# 12. Check Database Migration State

Current migration:

```bash
uv run alembic current
```

Migration history:

```bash
uv run alembic history
```

Show the latest migration:

```bash
uv run alembic heads
```

---

# 13. Roll Back a Migration

Rollback one migration:

```bash
uv run alembic downgrade -1
```

Rollback to a specific revision:

```bash
uv run alembic downgrade <revision>
```

Do not casually rollback migrations in production.

---

# 14. Migration Development Workflow

When modifying the database schema:

```text
SQLAlchemy model
       │
       ▼
alembic revision --autogenerate
       │
       ▼
Review migration
       │
       ▼
Commit migration
       │
       ▼
Deploy
       │
       ▼
alembic upgrade head
```

Example:

```bash
# Modify model

uv run alembic revision \
  --autogenerate \
  -m "add drone status"

# Review migration

uv run alembic upgrade head
```

Migration files must be committed to Git.

---

# 15. Never Edit an Applied Migration

Once a migration has been applied to a shared or production database:

**Do not modify the migration file.**

Instead create another migration.

Example:

```text
001_initial_schema.py
002_add_drone_status.py
003_add_simulation_priority.py
```

This preserves the database migration history.

---

# 16. Backend Tests

Run all tests:

```bash
cd apps/api
uv run pytest
```

Run with verbose output:

```bash
uv run pytest -v
```

Run a specific test:

```bash
uv run pytest tests/properties/test_simulation_state_machine.py
```

Run with coverage if configured:

```bash
uv run pytest --cov=app
```

---

# 17. Backend Linting

Run Ruff:

```bash
uv run ruff check .
```

Automatically fix issues where possible:

```bash
uv run ruff check . --fix
```

Format code:

```bash
uv run ruff format .
```

Check formatting without modifying files:

```bash
uv run ruff format --check .
```

---

# 18. Frontend Development

Move to the frontend:

```bash
cd apps/web
```

Install dependencies:

```bash
pnpm install
```

Start development:

```bash
pnpm dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

---

# 19. Frontend Scripts

Typical commands:

```bash
pnpm dev
```

Start development server.

```bash
pnpm build
```

Create production build.

```bash
pnpm preview
```

Preview the production build locally.

```bash
pnpm lint
```

Run ESLint.

```bash
pnpm format
```

Format the project if configured.

```bash
pnpm typecheck
```

Run TypeScript type checking if configured.

---

# 20. Frontend Environment Variables

Frontend environment variables should be stored in the appropriate `.env` files.

For Vite:

```env
VITE_API_URL=http://localhost:8000/api
```

Example:

```text
apps/web/
├── .env
├── .env.example
└── ...
```

Do not put secrets in frontend environment variables.

Anything exposed through a Vite `VITE_*` variable is accessible to the browser.

---

# 21. Running Frontend + Backend

Open two terminals.

### Terminal 1

```bash
cd apps/api
uv run uvicorn app.main:app --reload
```

### Terminal 2

```bash
cd apps/web
pnpm dev
```

Architecture:

```text
Browser
   │
   ▼
React / Vite
   │
   │ HTTP / WebSocket
   ▼
FastAPI
   │
   ▼
Services
   │
   ▼
SQLAlchemy
   │
   ▼
PostgreSQL
```

---

# 22. Production Backend

Install production dependencies:

```bash
uv sync --no-dev
```

Run database migrations:

```bash
uv run alembic upgrade head
```

Start FastAPI:

```bash
uv run uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000
```

For production, use an appropriate process manager/container orchestration strategy rather than relying on `--reload`.

---

# 23. Production Frontend

Build:

```bash
cd apps/web
pnpm build
```

This generates the production assets, typically under:

```text
dist/
```

These files can be served by a production web server such as Nginx or through the chosen hosting platform.

---

# 24. Production Database Migration

Production deployment should follow:

```text
Build
  │
  ▼
Deploy backend
  │
  ▼
Run migrations
  │
  ▼
alembic upgrade head
  │
  ▼
Start application
```

The production command is:

```bash
uv run alembic upgrade head
```

Never run:

```bash
uv run alembic revision --autogenerate
```

as part of production deployment.

Migrations should be generated during development, reviewed, committed, and then executed in production.

---

# 25. Recommended Production Deployment Order

```text
1. Build frontend
2. Build backend
3. Run tests
4. Deploy backend
5. Run Alembic migrations
6. Start/restart backend
7. Deploy frontend
8. Verify application
```

---

# 26. Git Workflow

Before creating a pull request:

```bash
git status
```

Backend:

```bash
cd apps/api

uv sync
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

Frontend:

```bash
cd apps/web

pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

Then:

```bash
git status
git add .
git commit -m "feat: add simulation management"
git push
```

---

# 27. Files That Should Be Committed

Commit:

```text
✓ pyproject.toml
✓ uv.lock
✓ alembic.ini
✓ alembic/
✓ package.json
✓ package-lock.json / pnpm-lock.yaml
✓ source code
✓ tests
✓ .env.example
```

Do not commit:

```text
✗ .env
✗ .venv/
✗ node_modules/
✗ __pycache__/
✗ dist/
```

---

# 28. Useful Command Reference

## Backend

```bash
cd apps/api

# Install dependencies
uv sync

# Development server
uv run uvicorn app.main:app --reload

# Tests
uv run pytest

# Lint
uv run ruff check .

# Format
uv run ruff format .

# Migration generation
uv run alembic revision --autogenerate -m "description"

# Apply migrations
uv run alembic upgrade head

# Rollback
uv run alembic downgrade -1

# Migration status
uv run alembic current

# Migration history
uv run alembic history
```

## Frontend

```bash
cd apps/web

# Install
pnpm install

# Development
pnpm dev

# Lint
pnpm lint

# Type checking
pnpm typecheck

# Production build
pnpm build

# Preview production build
pnpm preview
```

---

# 29. Production Checklist

Before deploying:

```text
[ ] Tests pass
[ ] Lint passes
[ ] Frontend builds successfully
[ ] Backend dependencies are locked
[ ] Database migration has been reviewed
[ ] Migration is committed to Git
[ ] Production environment variables are configured
[ ] Database backup exists
[ ] alembic upgrade head has been tested
[ ] Frontend production build has been tested
[ ] Backend health check works
[ ] Frontend can reach the production API
```

---

# 30. Golden Rules

### Database

**Never modify an already-applied production migration.**

Create a new migration instead.

### Alembic

Generate migrations in development:

```bash
uv run alembic revision --autogenerate -m "description"
```

Apply them everywhere:

```bash
uv run alembic upgrade head
```

### UV

Use:

```bash
uv run <command>
```

instead of manually activating `.venv` whenever possible.

### Secrets

Never commit:

```text
.env
```

Never put private API keys in the React frontend.

### Production

Never use:

```bash
--reload
```

in production.

Never generate migrations automatically during production deployment.

---

# 31. Quick Start

For a new developer:

```bash
# Clone
git clone <repository-url>
cd cinematographer-agent

# Backend
cd apps/api
uv sync

# Configure environment
cp .env.example .env

# Apply database schema
uv run alembic upgrade head

# Start API
uv run uvicorn app.main:app --reload
```

In another terminal:

```bash
cd apps/web

pnpm install

pnpm dev
```

The application is now running locally.
