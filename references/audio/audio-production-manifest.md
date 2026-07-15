# Cozy room audio production manifest

Generated with ElevenLabs Sound Effects on 2026-07-15. All outputs are MP3,
44.1 kHz / approximately 128 kbps. No voice model or voice ID was used. The
project must rely on the owner's ElevenLabs account terms for generated-asset
licensing.

The ambience returned at an exceptionally low provider level (about -70 LUFS),
so it received a deterministic +40 dB mastering gain. Its mastered level is
about -33 dB mean / -19 dB peak before runtime bus and cue gains.

| Runtime cue | File | Prompt | Requested / encoded duration | Influence | Loop |
| --- | --- | --- | --- | ---: | --- |
| `ambience.room` | `public/assets/audio/ambience/cozy-room-loop.mp3` | “seamless clearly audible cozy bedroom ambience loop for a calm decorating game, soft summer rain brushing a nearby window, low warm indoor room air, occasional distant small bird and gentle old-house wood settling, intimate close room tone throughout with no silent gaps, restrained steady mix, no melody, no music, no voice, no sudden loud events” | 14.0 / 14.0 s | 0.50 | Yes |
| `ui.select` | `public/assets/audio/ui/select-soft.mp3` | “tiny premium interface selection sound for a cozy decorating game, fingertip brushing a thick paper card with a soft wooden tick, clear gentle transient, extremely short dry tail, no beep, no music, no voice” | 0.50 / 0.48 s | 0.72 | No |
| `ui.confirm` | `public/assets/audio/ui/confirm-warm.mp3` | “short warm interface confirmation sound for a cozy room decorating game, small wooden latch closing cleanly with one delicate glass sparkle, clear soft transient, half-second tail, no melody, no voice, never harsh” | 0.65 / 0.64 s | 0.70 | No |
| `ui.cancel` | `public/assets/audio/ui/cancel-soft.mp3` | “short gentle interface cancel sound for a cozy decorating game, soft felt swipe and muted paper fold, clear quiet transient, dry half-second tail, no sad melody, no beep, no music, no voice” | 0.55 / 0.52 s | 0.72 | No |
| `world.place` variant 1 | `public/assets/audio/world/place-wood-01.mp3` | “short furniture placement sound for a cozy miniature room decorating game, small wooden object settling onto a wood floor with a soft felt contact, rounded clear transient, very short warm tail, no crash, no music, no voice” | 0.75 / 0.72 s | 0.68 | No |
| `world.place` variant 2 | `public/assets/audio/world/place-wood-02.mp3` | “alternate short furniture placement sound for a cozy miniature room decorating game, light painted wooden object gently set down with a tiny padded knock, rounded clear transient, very short dry tail, no crash, no music, no voice” | 0.72 / 0.72 s | 0.68 | No |
| `world.remove` | `public/assets/audio/world/remove-soft.mp3` | “short object removal sound for a cozy room decorating game, small wooden keepsake lifted from a shelf with a soft upward cloth whisk and tiny hollow release, clear gentle transient, short tail, no magic melody, no music, no voice” | 0.70 / 0.68 s | 0.67 | No |
| `world.invalid` | `public/assets/audio/world/invalid-gentle.mp3` | “short invalid placement feedback for a cozy room decorating game, gentle dull wooden tap against padded furniture, low soft transient, immediate dry stop, informative but never alarming, no buzzer, no music, no voice” | 0.58 / 0.56 s | 0.76 | No |
| `world.rotate` | `public/assets/audio/world/rotate-soft.mp3` | “short furniture rotation sound for a cozy miniature decorating game, small wooden feet softly swiveling over a woven rug, subtle texture and light tick at the end, compact dry tail, no scrape harshness, no music, no voice” | 0.70 / 0.68 s | 0.68 | No |
| `world.camera` | `public/assets/audio/world/camera-vintage.mp3` | “short vintage instant camera shutter for a warm cozy room game, precise mechanical click with a soft paper camera body resonance, crisp readable transient, tiny tail, no flash explosion, no music, no voice” | 0.60 / 0.60 s | 0.74 | No |
| `world.step.wood` | `public/assets/audio/world/step-wood.mp3` | “One quiet socked footstep on a warm wooden bedroom floor, soft close foley, no ambience, no voice, cozy game sound” | 0.70 s | 0.55 | No |
| `world.step.rug` | `public/assets/audio/world/step-rug.mp3` | “One soft muffled socked footstep on a thick woven rug, close dry foley, no ambience, no voice, cozy game sound” | 0.70 s | 0.55 | No |

## Runtime design

- `AudioSystem` creates at most one `AudioContext`, and only when `unlock()` is
  called from a user gesture.
- Master, UI, world, and ambience gain buses have persisted volume and mute
  settings.
- `world.place` alternates two variants without immediately repeating one.
- Per-cue cooldowns prevent high-frequency pointer events from machine-gunning
  sounds.
- World cues optionally accept a 3D position and use an HRTF panner.
- Ambience starts once, fades in/out, remains connected while the context is
  suspended, and cannot stack duplicate loops.
- Page visibility suspends and resumes the single context; explicit pause wins
  over automatic visibility resume.
- `getDiagnostics()`, `onDiagnostics()`, and
  `window.__MY_ROOM_AUDIO_DIAGNOSTICS__` expose load, source, context, variant,
  play-count, mute, volume, and failure state for tests.

## Intended trigger mapping

| Game event | Cue |
| --- | --- |
| Room opens | `ambience.room` via `startAmbience()` |
| Catalog card or ordinary UI choice | `ui.select` |
| Successful confirmation, save, or lighting change | `ui.confirm` |
| Placement cancellation / dismissed action | `ui.cancel` |
| Object placement or successful drag drop | `world.place` |
| Object removal | `world.remove` |
| Invalid placement attempt | `world.invalid` |
| Discrete object rotation | `world.rotate` |
| Photo shutter | `world.camera` |
| Walk step on wood / rug | `world.step.wood` / `world.step.rug` |

## Verification checklist

- [x] One ambience loop, three UI cues, six interaction files, and two material-aware footsteps exist.
- [x] Every file decodes through FFmpeg and reports the expected duration.
- [x] Runtime has one lifetime context and grouped volume/mute controls.
- [x] Variants, cooldowns, loop de-duplication, visibility handling, cleanup,
  and diagnostics are implemented.
- [x] Game triggers are connected in `Game.ts`, including visibility-safe ambience and surface-aware footsteps.
- [ ] Final levels and seamless-loop perception need real speaker/headphone and
  iOS Safari listening passes after integration.
