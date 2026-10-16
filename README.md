# Thruster Cup

Retro stunt racer starring Alan and Alex Stokes. Live at https://thrustercup.com

## Layout
- `public/` – the deployed site (Vercel serves this folder as-is; no build step)
- `src/game.html` – game source; `src/board_web.js` – leaderboard client for the web build
- `build.py` – regenerates `public/index.html` from `src/` (run `python3 build.py`, then commit)
- `supabase/` – leaderboard database migration and the `submit-score` edge function

## Leaderboard
Supabase project `thrustercup` (lrftoqlbvzxzyauscdpp). The `scores` table is public read-only.
All writes go through the `submit-score` edge function, which checks names, caps scores at 500,000,
rejects implausible finish times, keeps each player's best score, and rate-limits by player and by connection.

To remove a score: Supabase dashboard → Table editor → `scores` → delete the row.
