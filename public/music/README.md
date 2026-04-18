# Background Music Library

Self-hosted audio tracks for YouTube Shorts renders. Served at `https://www.r2ftrading.com/music/<filename>.mp3`.

## Why self-hosted
Pixabay's download flow no longer exposes stable right-click CDN URLs, and paid stock sites hotlink-block. Dropping files here gives us URLs we own and control.

## Naming convention
`<mood>-<descriptor>.mp3` — kebab-case, no spaces, no parens.

Valid moods match `MusicMood` in [src/lib/shorts-music.ts](../../src/lib/shorts-music.ts):
- `hype`
- `chill`
- `cinematic`
- `suspense`
- `uplift`

## Adding a new track
1. Drop the `.mp3` in this folder using the naming convention above
2. Commit + push (Vercel redeploys automatically)
3. Go to `/admin/shorts/music-library`
4. Add track with URL `https://www.r2ftrading.com/music/<filename>.mp3`, label, and mood
5. Trigger a test render to confirm it plays + ducks correctly

## Licensing
Current tracks are Pixabay CC0 (free for commercial use, no attribution required). If adding from another source, verify the license permits monetized YouTube use before committing.

## Sizing
Keep tracks under ~10 MB. Anything larger bloats deploys and slows first-render fetches on the DO droplet.
