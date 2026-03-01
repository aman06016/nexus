# NEXUS AI - MVP Phase 1 Implementation Plan (Monolith)

## 1) Scope Decisions Applied

This Phase 1 plan keeps all PRD core product functionality except the items explicitly removed for MVP:

- Removed for Phase 1:
- Authentication and user accounts
- OAuth/SSO (Google, GitHub, LinkedIn)
- S3 storage integration
- CI/CD pipelines (GitHub Actions, blue-green, K8s deploy flow)
- 8-service microservice split

- Kept for Phase 1:
- 2-minute scraping cycle
- Multi-source scraping
- Deduplication engine
- AI TLDR summaries
- Elasticsearch search
- Trending feed and scoring
- Like/Save interactions (anonymous session-based for MVP)
- Real-time breaking news WebSocket updates
- Admin source management and scrape health
- Dark-mode frontend, feed/detail/search/trending/saved/admin pages

## 2) Repository Structure (Two Folders Only)

```text
nexus/
  backend/
  frontend/
```

## 3) Backend Architecture (Single Monolith)

Use one Spring Boot application (Java 21) with modular packages. Internal module boundaries match future service extraction points, but deployment remains a single process.

### 3.1 Backend Stack (MVP)

- Java 21 + Spring Boot 3.x
- Spring WebFlux
- MongoDB (primary store)
- Redis (rate limiting, dedup pre-check cache, session keying for anonymous users)
- Kafka (internal pipeline topics)
- Elasticsearch (search + filters)
- Quartz Scheduler (2-minute source jobs)
- WebSocket STOMP (breaking news push)
- Playwright + Jsoup for scraping
- OpenAI/Claude API for TLDR + embeddings

### 3.2 Monolith Package Design

- `com.nexusai.config` - app configuration, environment profiles, beans
- `com.nexusai.source` - source registry, source configs, pause/resume
- `com.nexusai.scrape` - scheduler, workers, fetchers, anti-blocking logic
- `com.nexusai.ingestion` - extraction, normalization, dedup, enrichment
- `com.nexusai.article` - feed, detail, related, company/category views
- `com.nexusai.search` - Elasticsearch indexing and query APIs
- `com.nexusai.interaction` - like/save/share/view events (anonymous)
- `com.nexusai.trending` - score calculation and refresh jobs
- `com.nexusai.notify` - WebSocket and breaking-news broadcasts
- `com.nexusai.admin` - scrape health, controls, moderation actions
- `com.nexusai.common` - exceptions, utilities, constants, DTO conventions

### 3.3 Runtime Components

- `MongoDB`: articles, sources, interactions, digests, moderation queues
- `Redis`: bloom/seen keys, per-IP limiter, anonymous session state
- `Kafka` topics:
- `scraper.raw-articles`
- `ingestion.enriched-articles`
- `ingestion.breaking-news`
- `analytics.interactions`
- `Elasticsearch` index:
- `articles_v1`

## 4) MVP Data Model (No User/Auth Tables)

### 4.1 `articles`

- `_id`
- `url`, `canonicalUrl`, `urlHash`
- `title`, `summary`, `fullText`, `author`
- `publishedAt`, `scrapedAt`
- `source { name, domain, tier, authorityScore }`
- `companies[]`, `tags[]`, `category`
- `sentiment`, `impactScore`
- `thumbnail` (external URL only, no S3)
- `embedding[]`
- `stats { views, likes, saves, shares }`
- `status`, `lang`
- `duplicateOf`

### 4.2 `sources`

- `_id`
- `name`, `domain`, `tier`, `type`
- `scrapeConfig { url, interval, selectors, mode }`
- `status` (ACTIVE/PAUSED/ERROR)
- `lastSuccess`, `successRate`, `articlesPerDay`

### 4.3 `interactions`

- `_id`
- `sessionId` (anonymous cookie/session key)
- `articleId`
- `type` (LIKE, SAVE, SHARE, VIEW, CLICK)
- `timestamp`
- `ipHash`, `userAgentHash` (abuse control)

### 4.4 `admin_events`

- `_id`
- `action`
- `sourceId`
- `payload`
- `createdAt`

## 5) API Contract (MVP Adjusted)

All APIs are public in Phase 1, protected only by rate limiting and abuse controls.

- `GET /api/v1/articles`
- `GET /api/v1/articles/{id}`
- `GET /api/v1/trending`
- `GET /api/v1/search`
- `GET /api/v1/companies/{slug}/articles`
- `GET /api/v1/category/{slug}/articles`
- `POST /api/v1/articles/{id}/like` (toggle by `sessionId`)
- `POST /api/v1/articles/{id}/save` (toggle by `sessionId`)
- `POST /api/v1/articles/{id}/share`
- `POST /api/v1/articles/{id}/view`
- `GET /api/v1/digest/daily`
- `GET /api/v1/admin/sources`
- `POST /api/v1/admin/sources/{id}/pause`
- `POST /api/v1/admin/sources/{id}/resume`
- `POST /api/v1/admin/sources/{id}/rescrape`
- `GET /api/v1/admin/health`
- `WebSocket /ws/news`

## 6) Frontend Plan (Next.js 14, Dark UI)

### 6.1 Required Pages for MVP

- `/` latest feed with hero + grid + infinite scroll
- `/trending`
- `/saved` (session-scoped saved list)
- `/search`
- `/article/[slug]`
- `/company/[slug]`
- `/category/[slug]`
- `/digest`
- `/admin`

### 6.2 Shared UI Components

- Sticky header with global search
- Tabs: Latest, Trending, Saved, For You, Digest
- Company quick-filter chips
- Article card with TLDR, source, impact badge, actions
- Breaking-news toast
- Live top ticker
- Skeleton loaders and empty/error states

### 6.3 Session Model (No Login)

- Use anonymous `sessionId` cookie/local storage token
- Interactions tied to `sessionId`
- Saved/liked content tied to `sessionId`
- Optional migration path later: attach `sessionId` history to user account after auth is introduced

## 7) Implementation Phases (Detailed)

## Phase 1A - Foundation (Week 1)

- Create `backend/` and `frontend/` projects
- Add local Docker stack: Mongo, Redis, Kafka, Elasticsearch, Kibana
- Set env management and profile configs
- Add health endpoints and structured logging
- Define base schemas and index templates

Exit criteria:
- `docker compose up` boots all infra
- backend and frontend run locally
- health checks green

## Phase 1B - Scraping Core (Week 2)

- Implement source registry and scheduler (2-minute cycle)
- Add Jsoup worker for static pages
- Add Playwright worker for JS-heavy pages
- Add anti-blocking: per-domain backoff, UA rotation, jitter
- Publish raw events to Kafka

Exit criteria:
- 10+ sources scrape continuously
- raw events visible in Kafka
- scrape success/failure metrics available

## Phase 1C - Ingestion + Dedup + Enrichment (Week 3)

- Normalize URLs and hash canonical URL
- Redis seen-check + near-dup detection (SimHash threshold)
- Extract metadata/body and generate TLDR
- Generate tags/category/company/sentiment/impact
- Persist in Mongo and index in Elasticsearch

Exit criteria:
- duplicates suppressed
- enriched articles searchable
- feed data stable and fresh

## Phase 1D - Core Product APIs (Week 4)

- Build feed/detail/search/trending endpoints
- Build interaction endpoints (like/save/share/view) by session
- Implement trending job with decay and novelty approximation
- Implement related-articles query (embedding similarity)

Exit criteria:
- frontend can render end-to-end from APIs
- interactions update counts correctly
- trending output refreshes on schedule

## Phase 1E - Frontend UX Build (Week 5)

- Build full dark UI shell and feed page
- Add infinite scroll, filters, quick company tabs
- Build article detail and search pages
- Build trending, saved, digest pages

Exit criteria:
- complete browsing flow works on desktop/mobile
- LCP and responsiveness baseline acceptable

## Phase 1F - Real-Time + Admin (Week 6)

- Add WebSocket breaking-news push
- Add toast + ticker updates in frontend
- Implement admin APIs and admin page
- Add source pause/resume/manual rescrape and health panels

Exit criteria:
- new scraped item appears in UI without refresh
- admin controls affect scheduler behavior live

## Phase 1G - Stabilization (Week 7)

- Performance tuning (API p95 target path)
- Rate limit and abuse hardening
- Logging/metrics dashboards
- Regression testing and bug fixes
- Release checklist and runbook

Exit criteria:
- stable local/staging deployment
- P0 MVP acceptance passed

## 8) Non-Functional Targets for This MVP

- API p95 under 300ms for read endpoints in normal load
- Feed LCP under 2.5s on broadband desktop
- Scrape-to-feed latency under 2-3 minutes
- Service uptime target in MVP environment: 99.0%+
- Basic WCAG support for contrast, keyboard nav, focus states

## 9) What Is Deferred (Post-MVP)

- Any authentication and account system
- OAuth providers (Google/GitHub/LinkedIn)
- Cloud media storage via S3
- CI/CD automation and production deployment pipelines
- Full microservices decomposition

## 10) Build Prompt Sequence (Execution-Ready)

1. Scaffold backend monolith and frontend app in `nexus/backend` and `nexus/frontend`, plus Docker infra for Mongo/Redis/Kafka/Elasticsearch/Kibana.
2. Implement source registry, Quartz scheduler, Jsoup scraper, and Kafka raw article producer.
3. Add Playwright fallback and anti-blocking policies (backoff, rotation, jitter, retries).
4. Implement ingestion consumer with canonicalization, URL hash dedup, SimHash near-dup, metadata extraction, and Mongo persistence.
5. Add AI enrichment (TLDR, category/company tags, sentiment, impact, embeddings) and Elasticsearch indexing.
6. Build article APIs (feed/detail/company/category), search API, trending API, and related articles API.
7. Build anonymous interaction APIs for like/save/share/view with rate limiting and sessionId semantics.
8. Build frontend pages and dark UI components for feed, trending, search, article detail, saved, digest.
9. Implement WebSocket breaking news and frontend ticker/toast live updates.
10. Implement admin APIs/UI for source status, pause/resume, manual rescrape, and scrape health metrics.
11. Run optimization and reliability hardening pass (performance, logs, metrics, bug fixes, release checklist).

## 11) Acceptance Checklist

- Monolith backend serves all MVP endpoints
- Frontend renders all MVP pages with real data
- 2-minute scrape cycle operational
- Dedup and enrichment functioning
- Search and trending functioning
- Like/save/share/view functioning without auth
- Real-time breaking news functioning
- Admin controls functioning
- No auth/SSO/S3/CI-CD/microservice split present in Phase 1

