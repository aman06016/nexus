# Feed Feature Notes

## `FeedGrid` Responsibilities
- Render article cards consistently.
- Hydrate per-card like/save state using:
  - session id from `lib/session/session`
  - backend `GET /api/v1/articles/state` endpoint

## Design Choice
Interaction state hydration is centralized in `FeedGrid` so route pages remain simple and do not duplicate state-fetch logic.
