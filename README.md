# NEXUS AI - MVP Phase 1

This repository contains the monolith-first MVP implementation:

- `backend/` - Spring Boot monolith (no auth, no SSO, no S3, no CI/CD)
- `frontend/` - Next.js App Router frontend (dark theme)
- `docker-compose.yml` - local data stack (Mongo, Redis, Kafka, Elasticsearch, Kibana)

## Quick Start

1. Start infrastructure:

```bash
docker compose up -d
```

2. Run backend:

```bash
cd backend
mvn spring-boot:run
```

3. Run frontend:

```bash
cd frontend
npm install
npm run dev
```

## Current Status

- Monolith architecture skeleton created
- Core endpoints scaffolded (`/api/v1/articles`, `/api/v1/trending`, interaction toggles, admin source controls)
- WebSocket news stream endpoint scaffolded (`/ws/news`)
- Frontend core routes and dark design system scaffolded

Next: implement scraper workers, ingestion pipeline, dedup/enrichment, and search integration.
