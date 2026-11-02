# Post Composer — Social Media Studio (Full-Stack Production Architecture)

## 1. Project Overview

**Post Composer — Social Media Studio** is a full-stack social media composition, draft management, calendar scheduling, multi-platform publishing, media management, and analytics platform.

This repository contains:
1. **Frontend Application (`src/`)**: The React 19 + Redux Toolkit + Vite application (`PostComposer_Frontend`), wired to the versioned `/api/v1` REST API while preserving all original UI workflows, validation rules, and component contracts.
2. **Production Java 17 Spring Boot Backend (`backend/`)**: A modular monolithic Spring Boot 3.2.5 backend featuring MySQL 8 persistence, Flyway migrations, Spring Security (JWT access tokens, SHA-256 hashed refresh token rotation, BCrypt, RBAC, AES-256-GCM credential encryption), Apache Kafka asynchronous publishing with exponential backoff & Dead Letter Topics (DLQ), durable MySQL idempotency records, and OpenAPI/Swagger documentation.
3. **Live Runtime Gateway (`server.js`)**: A Node.js + Express + Vite full-stack gateway implementing the identical `/api/v1` REST contract for instant preview execution on port 3000.
4. **DevOps & Canary Deployment (`docker-compose.yml`, `docker-compose.canary.yml`, `deploy/`, `.github/workflows/ci-cd.yml`)**: Multi-stage Java 17 Docker build, GitHub Actions CI/CD publishing to GHCR, and Nginx 90/10 traffic-splitting Canary deployment with automated promotion and rollback scripts.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| **Backend Runtime** | Java 17, Spring Boot 3.2.5 (`Spring Web`, `Spring Data JPA`, `Hibernate`, `Spring Security`, `Spring Validation`, `Spring Kafka`, `Spring Cache` + Caffeine, `Spring Boot Actuator` + Prometheus) |
| **Database & Migrations** | MySQL 8.0+, Flyway (`V1__init_schema.sql`, `V2__seed_data.sql`), HikariCP |
| **Security** | JWT (`jjwt 0.12.5`), Refresh Token Rotation & Revocation, RBAC (`ROLE_USER`, `ROLE_ADMIN`), BCrypt Password Hashing, AES-256-GCM Token Encryption at Rest, Sliding-Window Rate Limiting |
| **Event Processing** | Apache Kafka 3.7 (KRaft mode), Exponential Backoff Retries, Dead Letter Topic (`post.publishing.requested.DLT`), MySQL-backed Idempotency (`idempotency_records`) |
| **API Documentation** | SpringDoc OpenAPI 3 / Swagger UI (`/swagger-ui.html`, `/v3/api-docs`) |
| **Frontend** | React 19, Redux Toolkit, React-Redux, Vite, Vitest + React Testing Library |
| **DevOps & Deployment** | Docker, Docker Compose, Nginx Canary Traffic Router, GitHub Actions, GitHub Container Registry (`ghcr.io`) |

---

## 3. Architecture & Frontend-to-Backend Integration Map

### Layered Modular Monolith Architecture
```
com.postcomposer.backend
├── config/          # SecurityConfig, KafkaConfig, OpenApiConfig, WebResourceConfig
├── controller/      # REST Controllers (/api/v1/*)
├── service/         # Business logic, transactions, validation, caching, audit logging
├── repository/      # Spring Data JPA repositories with @EntityGraph optimization
├── entity/          # Normalized JPA entities mapped to MySQL 8 tables
├── dto/             # Request/Response DTOs matching exact frontend contracts
├── security/        # JwtTokenProvider, JwtAuthenticationFilter, AesGcmCryptoService, RateLimitFilter, CorrelationIdFilter
├── integration/     # SocialPlatformAdapter, InstagramPlatformAdapter, LinkedInPlatformAdapter, PlatformAdapterRegistry
├── event/           # PostEventProducer, PostEventConsumer, DeadLetterTopicConsumer, PersistentJobPoller
└── exception/       # GlobalExceptionHandler (@RestControllerAdvice), ApiErrorResponse
```

### Frontend-to-Backend Integration Map

| Frontend Component / Feature | Backend Endpoint | Request DTO / Payload | Response DTO / Contract |
|---|---|---|---|
| **Authentication & Session** (`apiClient.login`, `register`, `refresh`, `logout`) | `POST /api/v1/auth/login`<br>`POST /api/v1/auth/register`<br>`POST /api/v1/auth/refresh`<br>`POST /api/v1/auth/logout` | `LoginRequest { email, password }`<br>`RegisterRequest { displayName, email, password }` | `AuthResponse { accessToken, refreshToken, tokenType, expiresInMs, user }` |
| **Header & Profile Settings** (`Header.jsx`, `Settings.jsx`) | `GET /api/v1/auth/me`<br>`PUT /api/v1/auth/me` | `UpdateProfileRequest { displayName, email, timezone }` | `UserProfileDto { id, displayName, email, timezone, roles }` |
| **Compose — Save as Draft** (`Compose.jsx`, `App.jsx -> saveDraft`) | `POST /api/v1/drafts` | `PostRequestDto { post, instagram, linkedin, hasImages, date, time, mediaIds }` | `PostResponseDto { id, timestamp, instagram, linkedin, post, hasImages, date, time, status: "DRAFT", warnings }` |
| **Drafts Screen — Load & Delete** (`Drafts.jsx`, `draftSlice.js`) | `GET /api/v1/drafts`<br>`PUT /api/v1/drafts/{id}`<br>`DELETE /api/v1/drafts/{id}` | Path `{id}` | `List<PostResponseDto>` |
| **Compose — Schedule Post** (`Compose.jsx`, `App.jsx -> schedulePost`) | `POST /api/v1/scheduled-posts` | `PostRequestDto { post, instagram, linkedin, hasImages, date, time, mediaIds }` | `PostResponseDto { id, timestamp, instagram, linkedin, post, hasImages, date, time, scheduledAt, status: "SCHEDULED" }` |
| **Calendar — View & Drag-and-Drop Reschedule** (`Calendar.jsx`, `scheduleSlice.js`) | `GET /api/v1/scheduled-posts`<br>`PUT /api/v1/scheduled-posts/{id}/move` | `MoveScheduleRequestDto { newDate, newTime }` | `PostResponseDto` with updated `date` and `scheduledAt` (`YYYY-MM-DDTHH:mm`) |
| **Compose — Publish Now** (`Compose.jsx`, `App.jsx -> publishPost`) | `POST /api/v1/posts` | `PostRequestDto { post, instagram, linkedin, hasImages, mediaIds }` | `PostResponseDto { status: "PUBLISHING" \| "PUBLISHED" }` (dispatched via Kafka) |
| **Compose — Media Attachments** (`Compose.jsx`, `App.jsx -> handleImages`) | `POST /api/v1/media/upload`<br>`GET /api/v1/media`<br>`DELETE /api/v1/media/{id}` | `multipart/form-data` (`file`: `.jpg`, `.jpeg`, `.png` <= 10MB) | `MediaFileDto { id, originalFilename, contentType, fileSize, url, createdAt }` |
| **Analytics Dashboard & Timeframe Filter** (`Analytics.jsx`, `Sidebar.jsx`) | `GET /api/v1/analytics/overview?timeframe=last7\|last30\|thisMonth`<br>`GET /api/v1/analytics/platforms`<br>`GET /api/v1/analytics/time-series`<br>`GET /api/v1/analytics/top-posts` | Query param `timeframe` | `AnalyticsOverviewDto { totalPosts, engagementRate, bestPlatform, optimalTime, chartBars, simulatedMetrics }` |
| **Settings — Social Platform Integrations** (`Settings.jsx`) | `GET /api/v1/platform-accounts`<br>`POST /api/v1/platform-accounts/{platform}/connect`<br>`DELETE /api/v1/platform-accounts/{platform}` | `ConnectPlatformRequestDto { handle, accessToken, refreshToken }` | `PlatformAccountDto { id, platform, handle, connected, sandboxMode, updatedAt }` |
| **AI Caption Assistant** | `POST /api/v1/ai/caption` | `AiCaptionRequestDto { prompt, instagram, linkedin }` | `AiCaptionResponseDto { caption, provider }` |

---

## 4. Project Directory Structure

```
.
├── .env.example
├── .github/workflows/
│   └── ci-cd.yml                  # JDK 17 Maven test + GHCR Docker image build & push
├── docker-compose.yml             # MySQL 8 + Apache Kafka (KRaft) + Spring Boot Backend
├── docker-compose.canary.yml      # Stable + Canary Backend containers + Nginx Traffic Router
├── deploy/
│   ├── nginx/nginx.canary.conf    # Weighted 90/10 split_clients + automatic 5xx failover
│   └── scripts/canary-control.sh  # Traffic shifting, health probing, promotion, and rollback
├── backend/                       # Complete Java 17 Spring Boot Production Backend
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/postcomposer/backend/
│       │   ├── config/
│       │   ├── controller/
│       │   ├── dto/
│       │   ├── entity/
│       │   ├── event/
│       │   ├── exception/
│       │   ├── integration/
│       │   ├── repository/
│       │   ├── security/
│       │   └── service/
│       ├── main/resources/
│       │   ├── application.yml
│       │   ├── application-prod.yml
│       │   └── db/migration/
│       │       ├── V1__init_schema.sql
│       │       └── V2__seed_data.sql
│       └── test/java/com/postcomposer/backend/
├── src/                           # Existing React + Redux Frontend integrated with /api/v1
└── server.js                      # Express + Vite runtime gateway for port 3000 preview
```

---

## 5. Prerequisites

- **Java 17** (Eclipse Temurin JDK 17+) & **Maven 3.9+** (for building the Spring Boot backend directly)
- **Docker 24+** & **Docker Compose v2+** (for running MySQL 8, Apache Kafka, Spring Boot backend, and Canary topology)
- **Node.js 22+** & **npm 10+** (for running the frontend and preview gateway)

---

## 6. Installation & Running Instructions

### Option A: Run Full Stack in Docker Compose (MySQL 8 + Kafka + Spring Boot Backend)
```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Build the Spring Boot JAR (optional if building inside Docker)
cd backend && mvn clean package -DskipTests && cd ..

# 3. Build and start MySQL, Kafka, and Spring Boot backend
docker compose up --build -d

# 4. Verify container health
docker compose ps
curl http://localhost:8080/actuator/health

# 5. View backend logs
docker compose logs -f backend

# 6. Stop services
docker compose down
```

### Option B: Run Frontend + Integrated Preview Server
```bash
npm install
npm run dev
# Opens on http://localhost:3000
```

---

## 7. Database Design & Flyway Migrations

Flyway automatically runs `V1__init_schema.sql` and `V2__seed_data.sql` on startup, creating:
- `users`, `roles`, `user_roles` (RBAC with seeded `Admin` user `admin@example.com`)
- `refresh_tokens` (SHA-256 hashed tokens with rotation tracking `replaced_by_hash` and revocation)
- `platform_accounts` (AES-256-GCM encrypted `encrypted_access_token` and `encrypted_refresh_token`)
- `posts` & `post_platforms` (platform-specific character counts, status, and external publication IDs)
- `media_files` (metadata and storage keys; binary files stored on volume `/app/uploads`)
- `scheduled_jobs` (restart-resilient persistent scheduling polled by `PersistentJobPoller`)
- `publishing_attempts` & `idempotency_records` (durable deduplication across Kafka retries)
- `post_analytics` & `audit_logs`

---

## 8. Kafka Event-Driven Publishing, Retries, DLQ, and Idempotency

1. **Producer (`PostEventProducer`)**: Publishes `PostPublishingEvent` to `post.publishing.requested` when a user clicks **Publish Now** or when `PersistentJobPoller` dispatches a due scheduled job.
2. **Idempotency (`IdempotencyService`)**: Before calling any external platform adapter, `PostEventConsumer` acquires a durable lock in `idempotency_records` in MySQL (`idempotency_key` + per-platform key). Retries never duplicate posts on Instagram or LinkedIn.
3. **Exponential Backoff & DLQ (`KafkaConfig` & `DeadLetterTopicConsumer`)**: Failed deliveries retry with exponential backoff (`1s -> 2s -> 4s -> 8s`). If retries are exhausted, `DeadLetterPublishingRecoverer` routes the event to `post.publishing.requested.DLT`, where `DeadLetterTopicConsumer` marks the post and job `FAILED` and records an audit log entry.

---

## 9. Social Media Integration (Sandbox vs. Production Mode)

- **Sandbox Mode (`PLATFORM_SANDBOX_MODE=true`)**: Clearly labeled development/testing mode that validates platform character limits (Instagram 2200 chars / 10 images; LinkedIn 3000 chars) and simulates publication with `ig_sandbox_*` / `urn:li:share:sandbox_*` IDs.
- **Production Mode (`PLATFORM_SANDBOX_MODE=false`)**: Calls official Meta Graph API (`/me/media_publish`) and LinkedIn UGC Posts API (`/v2/ugcPosts`) using decrypted AES-256-GCM OAuth tokens. Never silently falls back to simulated publishing in production.

---

## 10. Canary Deployment Demonstration

Start the two-version Canary stack (`backend-stable` at 90% weight and `backend-canary` at 10% weight behind Nginx):

```bash
# 1. Start Stable + Canary + Nginx Router
docker compose -f docker-compose.canary.yml up --build -d

# 2. Verify 90/10 traffic distribution across 20 requests
chmod +x deploy/scripts/canary-control.sh
./deploy/scripts/canary-control.sh status

# 3. Shift traffic to 50% Stable / 50% Canary
./deploy/scripts/canary-control.sh set-weight 50 50

# 4. Promote Canary to 100% traffic
./deploy/scripts/canary-control.sh promote

# 5. Instant Rollback to 100% Stable
./deploy/scripts/canary-control.sh rollback
```

---

## 11. Testing Instructions

```bash
# Run Frontend Vitest Test Suite
npm test

# Run Backend JUnit 5 Unit, Integration, and Security Test Suite
cd backend && mvn clean test
```
