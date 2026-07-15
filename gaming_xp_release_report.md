# Gaming Experience Roadmap — Release Report

Date: 15 July 2026  
Product: My Little Room  
Identity preserved: calm, private, local-first creative sandbox; optional goals; no timers, taste scores, coercive streaks, or public-by-default behavior.

## Skill-loading ledger

- `threejs-game-director`: loaded and used to sequence implementation and release gates.
- `threejs-gameplay-systems`: loaded for the story, interaction, placement, challenge, and progression loops.
- `threejs-aaa-graphics-builder`: loaded for art direction, cutaway architecture, materials, lighting, asset optimization, and visual scorecard.
- `threejs-game-ui-designer`: loaded for responsive HUD, modal focus, mobile controls, settings, precision, and catalog presentation.
- `threejs-debug-profiler`: loaded for runtime diagnostics, adaptive quality, collision broadphase, dense-room and mobile-resource checks.
- `threejs-qa-release`: loaded for production build, canvas/pixel, responsive, console, page error, and deployment verification.
- `threejs-3d-generator`: loaded and used for the storybook memory-box asset.
- `threejs-image-generator`: loaded and used for its concept source.
- `threejs-audio-generator`: loaded and used for ambience, interface, placement, camera, and footstep cues.
- `develop-web-game`: loaded and used for final deterministic browser interaction, screenshot, and `render_game_to_text` state capture.

## Reference ledger

- Gameplay workflows, custom collision selection, and new-game definition of done: loaded.
- AAA graphics implementation blueprint, model recipes, render recipes, material/lighting guidance, performance-safe detail, and visual scorecard: loaded.
- Game UI patterns, HUD readability, responsive fit, mobile input, focus, text-fit, and safe-area checklists: loaded.
- Debug/profile workflow, scene inspection, frame work, draw/load/resource, mobile DPR/input, and context-lifecycle checklists: loaded.
- QA/release workflow, visual review, playtest, static-host base path, screenshot/canvas/pixel, console, page error, production build, and release-risk checklists: loaded.
- Tripo image-to-3D, imported-asset integration, image generation, and audio generation references: loaded.

## Phase ledger

- Phase 1 — trust, framing, first success: complete.
- Phase 2 — cozy game loop and reasons to return: complete.
- Phase 3 — inhabiting and interacting in Walk: complete.
- Phase 4 — coherence, audiovisual feel, accessibility, and scale: complete.
- Phase 5 — precision, discovery, challenges, photo, and safe editable sharing: complete.
- P3 future community: correctly held behind a separate safeguarding product gate; no public upload or social backend was added.
- Local QA/release: complete.
- GitHub Pages deployment and production QA: performed after the audited commit reaches `main`.

## Gameplay systems

- Six Room Stories and six optional challenge variants provide clear, non-punitive prompts while free decorating remains immediate.
- The first story supports varied semantic choices and completes through look, seat, light, personal object, edit, Walk, and photo milestones.
- My Rooms, snapshots, scrapbook, progression, interaction state, settings, and share metadata persist locally through a versioned IndexedDB layer with migration and recovery.
- Walk has smooth kinematic movement, 1.68 m default eye height, 2.10 m cap, mouse/touch look, keyboard/joystick/D-pad movement, zoom, labeled fallback controls, and reach-based interaction prompts.
- 61 object kinds across five interaction families support seating, lights, containers, music, and keepsakes with deterministic cooldown and round-trip state.
- Placement uses custom deterministic collision: cached oriented footprints, exhaustive initial clear-spot validation, and a spatial-grid broadphase for live dragging. A full physics engine was intentionally not selected because rigid-body simulation would reduce predictability in a precision room editor.

## AAA graphics

- The room and player-authored arrangement remain the hero/player; camera framing protects the usable play area instead of obscuring the composition.
- Four actual wall groups exist. Camera-near walls are hidden as a robust dollhouse cutaway and far walls remain fully opaque, eliminating transparent-sort artifacts across rectangle, L, T, and U plans.
- Morning, afternoon, evening, and night interpolate renderer exposure, fog, ambient/key/fill/lamp light, dust, and ambience coherently.
- `docs/art-bible.md` is referenced by every model factory. The Sunday wardrobe now has a recessed door reveal with no protruding center panel.
- The generated memory box adds a high-value signature interactable without replacing the performant procedural catalog.

## UI

- Desktop and mobile surfaces have deterministic modality, focus return, inert closed states, safe areas, 44 px targets, responsive tool grouping, and 200% text/forced-color/reduced-motion coverage.
- My Rooms cards expose name, thumbnail, date, object count, story, open, rename, duplicate, export, archive, recover, and explicit permanent delete.
- Settings apply and persist UI/text scale, contrast, motion, particles, master/music/world/UI audio buses, simplified controls, labels, and read-aloud preferences.
- Precision tools place expert operations behind one optional modal: multi-select, group, lock/hide, clipboard, numeric transforms, grid, align/distribute, measure, repeat, and bookmark.
- Catalog collections, contextual reasons, search, filters, favorites, recently used, and Surprise me remain secondary to the full 155-piece catalog.

## Debug/profile

- Runtime diagnostics expose actual frame-work p50/p95/p99, quality tier, collision cell count, wall states, player/camera state, object count, settings, story, and interactions.
- Final local default-room sample: quality `high`; p50 0.70 ms, p95 1.10 ms, p99 1.60 ms; 20 collision cells; 10 objects.
- Adaptive quality bounds DPR, shadows, shadow-map size, and particles. The loop pauses on hidden documents and pagehide disposes WebGL, audio, observers, object URLs, persistence handles, and timers.
- Dense fixtures pass at 100, 200, and 500 objects on desktop; the 100-object mobile budget passes while 200/500 mobile cases are intentionally excluded as non-product target fixtures.
- Production chunks: HTML 40.01 kB (8.65 kB gzip), CSS 55.23 kB (12.30 kB gzip), game 687.03 kB (185.47 kB gzip), lazy GLTF loader 44.29 kB (13.18 kB gzip), Three.js core 242.04 kB (66.02 kB gzip).

## External asset sourcing

Credential probe output:

```text
TRIPO_API_KEY=SET
GEMINI_API_KEY=SET
ELEVENLABS_API_KEY=SET
```

Chosen sources:

- Hero/player: player-created room composition plus authored procedural room architecture; external replacement not needed because editing clarity is the hero requirement.
- Signature rewards/interactables: image generator concept `assets/concepts/storybook-memory-box.png` → 3D generator task `490ed48c-878f-4b5e-94a4-60dab8918017` → optimized `public/assets/models/storybook-memory-box/storybook-memory-box.glb`.
- World/sky/background: authored room geometry and generated/procedural finish textures; no non-editable background plate obscures the room.
- Materials/textures/decals: shared authored warm-wood, plaster, fabric, glass, wallpaper, floor, rug, and illustrated-prop treatment under the art bible; generated PBR maps are limited to the signature memory box.
- UI/HUD: semantic HTML/CSS and small text/icon primitives preserve accessibility; no raster UI skin was used where it would harm scaling.
- Audio generator: ElevenLabs-generated assets integrated through one audio owner, including `public/assets/audio/ambience/cozy-room-loop.mp3`, `public/assets/audio/ui/confirm-warm.mp3`, `public/assets/audio/world/place-wood-01.mp3`, `public/assets/audio/world/camera-vintage.mp3`, `public/assets/audio/world/step-wood.mp3`, and `public/assets/audio/world/step-rug.mp3`.

The 3D asset was reduced from 58.06 MB / 1,023,836 uploaded vertices / 4K maps to 2.0 MB / 64,225 vertices / 1K maps before runtime integration. Its source task JSON and rendered reference are stored beside the GLB.

## QA/release

- Build: `npm run build` passes with TypeScript and Vite production packaging.
- CSS: Stylelint passes; `git diff --check` passes.
- Browser suite: **154 passed, 6 intentional platform skips, 0 failed** across desktop Chrome and mobile Safari emulation, two GPU-safe workers, no retries.
- CI parity: the project-specific one-worker configuration passes locally as **79 desktop passed / 1 intentional skip** and **75 mobile passed / 5 intentional skips**, with statically loaded browser test modules and 0 failures.
- Desktop: default room, four wall shapes, orbit cutaway, Walk, placement, precision, photo, persistence, density, responsive layouts, accessibility, and sharing pass.
- Mobile: touch movement/look, labeled D-pad, zoom/height, placement, 100-object budget, responsive/200% text, photo, and accessibility pass.
- Photo soak: 20 consecutive iOS-class standard captures pass without context errors.
- Screenshot: final `/tmp/myroom-release/shot-0.png` was visually inspected; the room is nonblank, framed, readable, and exposes far walls while cutting front/right near walls.
- Canvas pixel inspection: Playwright PNG sampling passes nonblank alpha, variance, and color-bucket thresholds.
- Runtime text state: `render_game_to_text` reports ten visible objects, `decorating` state, finite camera values, and four discrete wall values (`back=1`, `left=1`, `front=0`, `right=0`).
- Console: no error messages in the interactive desktop/mobile visual flows.
- Page error: no unhandled page errors in the interactive desktop/mobile visual flows.
- Production URL target: `https://ramonlinares.github.io/my-room-decoration/`.

## Ten-category visual scorecard

Scores use the loaded premium scorecard on a 0–10 scale. “Before” is the pre-roadmap production baseline; “After” is the final local release candidate.

| Category | Before | After | Evidence |
|---|---:|---:|---|
| Art direction | 6.5 | 8.8 | Enforced art bible, coherent warm storybook palette, model-factory references. |
| Hero/player | 6.4 | 8.7 | Safe-frame camera and clean cutaway keep the player-authored room dominant. |
| Obstacles/enemies | 5.8 | 8.5 | No enemies by design; collision boundaries, invalid feedback, and spatial clarity now read consistently. |
| Rewards/interactables | 4.5 | 9.0 | Stories, scrapbook, challenges, 61-kind Walk interactions, and signature memory box. |
| World/environment | 7.0 | 9.0 | Four-wall rectangle/L/T/U rooms, finishes, atmosphere, spatial overview, and room library. |
| Materials/textures | 6.7 | 8.8 | Shared finishes, improved glass/fabrics/wood/plaster, optimized PBR signature prop. |
| Lighting/render | 6.5 | 9.0 | Four blended moods, fog/exposure/light coherence, robust opaque wall cutaway. |
| VFX/motion | 5.5 | 8.6 | Smooth Walk/camera, tactile settle/invalid feedback, shutter, dust, reduced-motion path. |
| UI/HUD | 6.0 | 9.1 | Responsive modal system, settings, precision, touch HUD, focus and text-scale coverage. |
| Performance evidence | 5.0 | 9.3 | Frame-work percentiles, adaptive quality, 500-object desktop and 20-photo mobile soaks. |
| **Average** | **5.99** | **8.88** | **+2.89 with measurable release evidence.** |

## Automatic failures

None.

- No missing hero/primary interaction loop: the editable room is the hero and all core tools remain available.
- No opaque near-wall regression or transparent-sort artifact: four-shape cutaway tests pass.
- No unusable mobile control state: touch, D-pad, zoom, height, safe areas, and accessibility tests pass.
- No unbounded external asset: the only generated GLB is optimized and lazy-loaded.
- No missing audio integration: generated ambience, UI, world, and surface-aware footsteps are routed through one owner with independent buses.
- No release blocker from build, console, page error, screenshot, canvas, pixel, accessibility, persistence, photo soak, or dense-room gates.
- Public community remains deliberately absent until moderation and safeguarding requirements are separately approved; this is the roadmap's P3 gate, not an incomplete local-first release item.
