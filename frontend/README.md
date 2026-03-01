# Frontend (Next.js)

## Run

```bash
npm install
npm run dev
```

## Routes scaffolded

- `/`
- `/trending`
- `/saved`
- `/search`
- `/digest`
- `/admin`
- `/company/[slug]`
- `/category/[slug]`
- `/article/[slug]`

## Notes

- Dark-theme token system is defined in `app/globals.css`
- API client currently targets `http://localhost:8080`
- WebSocket ticker listens on `/ws/news`
