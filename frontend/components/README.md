# Frontend Components Notes

## Current UX Infrastructure
- `feedback/ToastProvider.tsx`: global success/error/info toasts.
- `NavBar.tsx`: global search validation + keyboard productivity (`Cmd/Ctrl+K`, `Alt+1..5`).
- `ArticleCard.tsx`: article CTA surface with like/save and metadata formatting.

## Behavior Contracts
- `ArticleCard` accepts initial interaction state props for hydration:
  - `initialSaveActive`
  - `initialLikeActive`
- `onSaveStateChange` is used by saved-list pages to remove unsaved cards immediately.

## Why This Exists
This keeps interaction UX consistent across Latest/Trending/Digest/Search/Saved pages while preserving anonymous session behavior.
