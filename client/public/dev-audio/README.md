# Dev-only audio assets

**Status:** Phase 1 development placeholder. **Scheduled for deletion in Phase 7** when Cloudflare R2 + real audio assets ship (Batch F §20).

**License:** All files in this folder MUST be CC0 / Public Domain. No attribution-required files.

## Files

| File       | Source URL | Size | License | Notes |
|------------|------------|------|---------|-------|
| `bell.mp3` | _to be filled_ | _to be filled_ | CC0 | Single bell tone, ~0.5–1.5s. Used as the alarm sound until Phase 7. |

## How to add the file

1. Source a `.mp3` under 50KB from https://freesound.org (filter License → Creative Commons 0).
2. Save as `bell.mp3` in this folder.
3. Update the table above with the source URL.

## Production build behavior

`client/public/` is normally copied verbatim into the Vite build output. The Phase 9 hardening checklist includes a step to verify `dev-audio/` is excluded from `client/dist/` before deploy. The `playAlarm` utility reads the audio path from `import.meta.env.VITE_AUDIO_BASE_URL`; in production this points at the R2 public URL and `dev-audio/` is never referenced.

## Removal task (Phase 7)

When Phase 7 of Batch F §20 executes (Cloudflare R2 upload), the final step of that phase MUST be:

```
rm -rf client/public/dev-audio/
```

And update `playAlarm.ts` to remove the `/dev-audio` fallback path.
