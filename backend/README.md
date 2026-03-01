# Backend (Spring Boot Monolith)

## Architecture Principles

- Modular monolith with explicit module boundaries
- Package-by-feature with four layers per module:
  - `api` - controllers and transport DTOs
  - `application` - use cases and orchestration
  - `domain` - entities and business logic
  - `infrastructure` - repositories and adapters
- No auth in Phase 1 (anonymous session interactions)

## Run

```bash
mvn spring-boot:run
```

## Core APIs (MVP scaffold)

- `GET /api/v1/system/health`
- `GET /api/v1/articles`
- `GET /api/v1/articles/{id}`
- `GET /api/v1/trending`
- `POST /api/v1/articles/{id}/like` (requires `X-Session-Id`)
- `POST /api/v1/articles/{id}/save` (requires `X-Session-Id`)
- `GET /api/v1/admin/sources`
- `POST /api/v1/admin/sources/{id}/pause`
- `POST /api/v1/admin/sources/{id}/resume`
- `POST /api/v1/admin/sources/{id}/rescrape`
- `POST /api/v1/admin/news/publish`
- `WS /ws/news`
