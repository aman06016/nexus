# Interaction Module Notes

## Purpose
Owns anonymous session interactions for articles (`LIKE`, `SAVE`, etc.) and keeps article counters synchronized.

## Key Flows
1. `POST /api/v1/articles/{id}/like`
2. `POST /api/v1/articles/{id}/save`
3. `GET /api/v1/articles/state?articleId=<id>&articleId=<id2>`

## Invariants
- Interaction state is binary per `(sessionId, articleId, type)`.
- Toggle-off removes all legacy duplicates for the tuple.
- Article stats (`stats.likes`, `stats.saves`) are recomputed from interaction count after each toggle.

## Extension Points
- Add `CLICK`/`VIEW` tracking endpoint if interaction analytics are needed in UI.
- Move stats sync to event-driven update if write throughput grows.
