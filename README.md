# Kids Casting Backend

Node.js + NestJS + PostgreSQL + Prisma + Redis backend for the Kids Casting Platform.

## Stack
- NestJS (TypeScript)
- PostgreSQL + Prisma ORM
- Redis (sessions, caching, queues)
- JWT + Refresh Tokens
- AWS S3 (media storage)
- BullMQ (background jobs)
- Socket.IO (realtime)
- Swagger/OpenAPI

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start infrastructure (Docker)
```bash
docker-compose up -d postgres redis
```

### 4. Run database migrations
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start development server
```bash
npm run start:dev
```

API: http://localhost:3000/api/v1  
Swagger: http://localhost:3000/docs

## Phases Implemented

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Backend Foundation (NestJS, Docker, Health APIs) | ✅ |
| 2 | Database Architecture (Full Prisma Schema) | ✅ |
| 3 | Authentication & User Management | ✅ |
| 4 | Guardian / Parent Module | ✅ |
| 5 | Talent Profile System | ✅ |

## API Endpoints

### Health
- `GET /api/v1/health`
- `GET /api/v1/version`

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/change-password`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/send-email-verification`
- `POST /api/v1/auth/send-otp`
- `POST /api/v1/auth/verify-otp`
- `GET  /api/v1/auth/me`
- `GET  /api/v1/auth/sessions`
- `DELETE /api/v1/auth/sessions/:id`

### Guardian
- `GET    /api/v1/guardian/profile`
- `PATCH  /api/v1/guardian/profile`
- `GET    /api/v1/guardian/dashboard`
- `GET    /api/v1/guardian/talents`
- `POST   /api/v1/guardian/talents`
- `GET    /api/v1/guardian/talents/:id`
- `PATCH  /api/v1/guardian/talents/:id`
- `DELETE /api/v1/guardian/talents/:id`

### Talents
- `GET    /api/v1/talents/:id`
- `PATCH  /api/v1/talents/:id`
- `GET/POST/PATCH/DELETE /api/v1/talents/:id/photos`
- `GET/POST/DELETE /api/v1/talents/:id/videos`
- `GET/POST /api/v1/talents/:id/audio`
- `GET/PATCH /api/v1/talents/:id/skills`
- `GET/PATCH /api/v1/talents/:id/languages`
- `GET/POST/PATCH/DELETE /api/v1/talents/:id/credits`
- `GET    /api/v1/talents/:id/completion`
- `GET    /api/v1/talents/:id/comp-card`
