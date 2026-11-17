# Tag

Community profiles connected by interest tags rated 1–10. Rank is the sum of all tag levels.

## Phases

1. **Core** — profiles, feed (newest/active), rank rollup, tag+level browse, handle login, SQLite
2. **Discovery** — endorsements, looking-for, similar-to-you, rising tab, tag cloud
3. **Social** — DMs, friends, waves, block/mute, reports
4. **Gamification** — per-tag top-10 boards (open/beginner), banners, titles, seasons, streaks, spotlights

## Run

```bash
npm install
npm run dev
```

SQLite file: `data/tag.db` (created on first request). Seed handles: `mira`, `jon`, `ada`.
