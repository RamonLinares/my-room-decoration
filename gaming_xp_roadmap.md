# Gaming Experience Roadmap — My Little Room

Last reviewed: 15 July 2026  
Reviewed experience: [GitHub Pages deployment](https://ramonlinares.github.io/my-room-decoration/)  
Scope: game design, player motivation, onboarding, accessibility, mobile play, game feel, art direction, audio, performance, persistence, and long-term replayability

## Purpose

This roadmap combines three independent expert reviews and a direct inspection of the live game and source:

1. A senior game director and systems designer focused on the core loop, progression, rewards, replayability, and retention.
2. A player-research and inclusive game-UX specialist testing the experience as a casual decorator, child, non-gamer, mobile player, disabled player, and returning power user.
3. A Three.js game-feel, art-direction, audio, and performance specialist focused on camera, placement, Walk mode, feedback, world coherence, technical scale, saves, and device robustness.

The intent is not to turn the experience into a conventional score-driven game. It is to make the existing creative sandbox more motivating, tactile, inhabitable, memorable, and safe to revisit.

### Priority definitions

- **P0 — Foundation:** protects player work or fixes a major first-session, mobile, or accessibility failure.
- **P1 — Core game layer:** creates motivation, completion, embodiment, and a reason to return.
- **P2 — Depth:** expands expression, precision, sharing, challenge, and long-session quality.
- **P3 — Future:** valuable only after the private, local-first creative loop is excellent.

## Executive verdict

My Little Room is already a strong creative toy and a polished room editor. Its current loop is:

**browse → place → transform → walk through → photograph/share**

The editor portion is unusually capable: 154 props, exact thumbnails, search, filters, favorites and recents, four room shapes, finishes, collision-aware placement, precise transforms, undo/redo, autosave, keyboard object management, Walk mode, and Photo mode.

What it lacks is the emotional structure around that editor:

- a reason to begin beyond browsing a large catalog;
- a first creative victory;
- a clear but non-judgmental sense of completion;
- meaningful activities after entering Walk mode;
- a durable record of several rooms and their history;
- a personal reward for taking a photo;
- a reason to return that does not use pressure, currency, or streaks.

The recommended product identity is a **cozy creativity game** whose loop is:

> **Inspiration → Making → Inhabiting → Remembering → Returning**

A good session should create this emotional arc:

> “What should I make?” → “I have an idea” → “It is taking shape” → “This feels like mine” → “I want to preserve or revisit it.”

## Design pillars

### 1. Creativity without judgment

Free decorating must never have a fail state. Optional prompts can recognize understandable facts—such as adding seating, a light, or five objects—but must not grade taste or aesthetic quality.

### 2. Safe experimentation

Players should be confident that trying a new room, importing a design, changing a floor plan, or letting a child experiment cannot destroy a valued creation.

### 3. Make, then inhabit

Decorating decisions should affect what the player can experience in Walk mode: sitting, switching on lamps, opening furniture, playing music, inspecting keepsakes, and photographing the result.

### 4. Calm, tactile feedback

Actions should feel responsive and satisfying without becoming noisy. Feedback should favor a soft settle, material-aware sound, clear invalid reason, subtle lighting response, and optional haptics over spectacle.

### 5. Local-first memory

Rooms, snapshots, photos, captions, and progress should remain private and local by default, export cleanly, and never require posting or an account.

### 6. One game for different bodies and skill levels

The creative loop must work with touch, mouse, keyboard, screen reader, 200% text zoom, reduced motion, reduced particles, high contrast, and simplified controls.

## Strengths to preserve

- Warm storybook/miniature identity and welcoming “Make yourself at home” tone.
- A furnished starter room that reduces blank-canvas anxiety.
- Direct manipulation, large controls, and playful catalog language.
- Non-destructive placement preview with visible valid/invalid state.
- Undo/redo, autosave, XML backup, and placement cancellation.
- Catalog search, filters, favorites, recents, themed object names, and faithful previews.
- Walk and Photo as a natural payoff for decorating.
- Keyboard object management, accessible dialogs, focus restoration, live announcements, forced-colors support, and reduced-motion handling.
- No accounts, ads, purchases, rankings, strangers, energy, or competitive pressure.
- Lightweight default scene and a deferred editor bundle.

## What must not be added

- No aesthetic score, AI beauty judgment, or hidden star-rating formula.
- No coins, energy, loot boxes, furniture durability, build timers, or grind.
- No daily streak punishment, expiring rewards, or notification pressure.
- No mandatory tutorial, mandatory brief, or forced social posting.
- No public leaderboard for creative work.
- No public comments, chat, or child-facing community system without full moderation and safeguarding.
- No essential furniture or building tool locked behind progression.

## Evidence baseline

### Experience

- The default room communicates mood immediately, but it already looks finished; a new player may admire it without feeling authorship or knowing what to do next.
- The first interaction explains possibilities but does not guide one complete place → edit → Walk → Photo loop.
- Walk mode supports movement, look, zoom, height, Photo, and Exit, but objects cannot be meaningfully used.
- Photo mode is the strongest completion beat, yet photos leave the game unless downloaded or shared.
- Only one browser room is active. Creating a different room risks overwriting the current design or requires manual XML management.

### Accessibility and personas

- The core editor is keyboard-operable and has a strong accessible DOM object manager.
- A nonvisual player can manipulate objects but cannot form a concise spatial model of the room or relationships such as “chair beside desk.”
- Mobile Walk mode can show a hint, four movement controls, four camera controls, Photo, and Exit at once.
- Some helper text is very small, and there is no explicit UI-scale, reduced-particle, or separate music/effects setting.
- Technical language such as XML, align to wall, and floor-plan proportions is unsuitable for a simplified or child-friendly mode.

### Visual and technical

- Live desktop default room: 87 draw calls, 3,346 triangles, 84 geometries, and 5 textures.
- Live mobile default room: 64 draw calls, 2,802 triangles, 83 geometries, and 5 textures.
- The starter scene is lightweight, but 84 geometries for 10 objects indicates limited sharing and a likely scaling issue in dense rooms.
- The current automated frame budget permits an average of 55 ms, which is approximately 18 FPS; future gates should use p50/p95/p99 and long tasks.
- Walk collision repeatedly rebuilds object bounds and performs linear data lookups.
- Runtime diagnostics and resize/media-query work still occur more often than necessary.
- Game action sounds create a new `AudioContext` per event even though a separate audio system exists.
- Object saves are debounced without a guaranteed `pagehide` flush or robust quota-error recovery.
- The photoreal rug, simplified furniture, flat floor treatment, and highly stylized teddy use inconsistent abstraction levels.
- The Sunday wardrobe center seam reads as a protruding front panel rather than a recessed door reveal.

## Expert consensus and productive disagreements

All reviewers agree that the product should remain a cozy sandbox and gain optional structure rather than conventional failure or competition.

Strong consensus:

- Protect several creations before adding more content.
- Teach one complete first-session creative loop.
- Turn Photo into an in-game memory and return hook.
- Make Walk mode simpler on mobile and more meaningful everywhere.
- Add gentle creative prompts, not taste scores.
- Improve tactile placement, sound, lighting, and object feedback.
- Preserve privacy and accessibility as product pillars.

Different emphasis:

- The game-design review puts room history and optional Room Stories first.
- The persona review treats mobile Walk simplification and nonvisual spatial understanding as foundational.
- The technical review puts responsive camera framing, tactile placement, save durability, one-context audio, and dense-room scaling ahead of additional content.

The sequence below resolves this by fixing data safety, first-session comprehension, and device/access barriers before adding the broader story and interaction systems.

## Prioritized roadmap

### P0 — Add a local-first My Rooms library, snapshots, and safe recovery

**Problem**

One autosaved room is a serious retention and trust limit. A player cannot comfortably start over, test another theme, give the game to a child, or revisit an older design without manual file handling.

**Change**

Create a **My Rooms** home surface with:

- room cards containing name, thumbnail, last-edited date, object count, and optional story/template;
- New, Open, Duplicate, Rename, Archive/Delete, Export, and Restore actions;
- choices for **Empty room**, **Furnished starter**, and later **Room Story**;
- automatic restore points before imports and major floor-plan changes;
- a bounded snapshot history;
- a clear distinction between autosave, snapshot, and exported backup.

Move room documents and photos to a versioned IndexedDB persistence layer. Keep a migration path from the existing localStorage save.

**Acceptance criteria**

- Existing players migrate without losing their current room, settings, favorites, or recents.
- A player can create, duplicate, rename, switch among, export, and delete at least 10 rooms.
- Every room card has an automatically generated thumbnail.
- Delete names the affected room, requires confirmation, and supports recovery through archive or a grace period.
- Import and room-shape changes create a restore point before mutation.
- At least the last 20 snapshots or the previous seven days are recoverable within a bounded storage policy.
- Storage quota and write errors are visible and do not leave a permanent “Saving…” state.
- A committed edit is durable within 500 ms and pending data is flushed on `pagehide`.

**Dependencies**

Room IDs, persistence schema/versioning, migration tests, thumbnail generation, image compression, quota management, and snapshot pruning.

**Risks to avoid**

- Do not silently overwrite the active room during import.
- Do not persist every drag frame; persist committed commands.
- Do not make XML the primary multi-room interface, but retain it as portable ownership and recovery.

---

### P0 — Create an optional first-session creative victory

**Problem**

The welcome describes the editor but does not help a child, non-gamer, or first-time 3D user complete a satisfying loop. The furnished starter can look finished enough that the player never feels invited to change it.

**Change**

After **Open the door**, offer two equally prominent choices:

- **Decorate freely**
- **Make a cozy reading corner**

The guided choice should be an action-based Room Story, not a tutorial dialog:

1. Look around.
2. Add somewhere to sit.
3. Add a light.
4. Add one thing that feels personal.
5. Move, turn, or recolor one piece.
6. Enter Walk.
7. Take and save a photo.

Use short spotlight prompts attached to the active control. Guidance must remain skippable, reopenable, and fully compatible with keyboard and screen readers.

**Acceptance criteria**

- Median time to first placement is under 60 seconds in novice testing.
- A new player reaches the complete creative payoff in under three minutes.
- At least 85% of first-time test participants place an object without external help.
- At least 70% discover object editing and Walk within five minutes.
- Requirements use semantic categories, not exact object IDs.
- Prompts name touch and keyboard alternatives, never block free exploration, and do not repeat after completion or skip.
- Tour state persists locally and can be restarted from Help.

**Dependencies**

Tutorial milestone events, semantic catalog tags, persistent onboarding state, responsive spotlight positioning, and a first scrapbook entry.

**Risks to avoid**

- No long text tour.
- No forced furniture choice.
- No modal that repeatedly interrupts experimentation.

---

### P0 — Make the responsive camera frame the usable play area

**Problem**

The camera currently fits room dimensions but not horizontal FOV, aspect ratio, or UI occlusion. In portrait, the header and dock cover important parts of the room, while desktop can remain farther away than necessary.

**Change**

Create a safe-frame camera system that considers:

- room bounding sphere/box;
- vertical and horizontal FOV;
- viewport aspect ratio;
- header, dock, open panel, safe-area, and touch-control insets;
- selected-object focus versus full-room framing;
- portrait/landscape rotation and resize;
- preserved intentional user camera state.

Add **Fit room**, **Focus selection**, and optional top/front camera presets.

**Acceptance criteria**

- On entry, Reset, resize, and rotation, all room bounds fit inside the unobstructed canvas with at least 20 CSS px clearance.
- Tests verify world bounds against actual UI safe areas at phone portrait, phone landscape, tablet, laptop, and desktop sizes.
- Desktop framing does not become unnecessarily distant.
- Focus selection transitions in 250–400 ms, has a reduced-motion alternative, and never settles inside opaque geometry.
- Camera changes never mutate editor history or object state.

**Dependencies**

World-to-screen projection helpers, UI inset reporting, camera state model, and responsive screenshot assertions.

---

### P0 — Make mobile Walk mode simple and comfortable

**Problem**

The first-use hint, D-pad, zoom, height, Photo, and Exit controls can obscure much of the room. Four movement buttons require large thumb travel, and height can rise above the room, weakening scale and comfort.

**Change**

- Use a floating thumb joystick or two-zone move/look scheme by default.
- Retain a labeled D-pad as an accessibility setting.
- Collapse zoom and height into an expandable camera control.
- After first-use guidance, leave only Move, Photo, Interact, and Exit visible.
- Separate grounded Walk from an explicitly named elevated Photo/free-camera mode.
- Tune movement with gentle acceleration/deceleration and predictable wall sliding.

**Acceptance criteria**

- At 320×568, 390×844, and representative landscape sizes, persistent controls obscure no more than 25% of the viewport.
- Ten novice mobile test participants can move, look, interact, take a photo, and exit without help.
- Every target is at least 44×44 CSS px, reachable by either thumb, and respects safe areas.
- Pointer cancel, lost capture, blur, and visibility change never leave movement stuck.
- Default eye height is approximately 1.6–1.75 room units, with grounded adjustment capped around 2.1.
- Input-to-visible movement begins within 100 ms.
- Acceleration/deceleration is approximately 100–180 ms and diagonal speed remains normalized.
- Reduced-motion mode removes head motion and optional camera easing.

**Dependencies**

Unified input intents, mobile settings, camera safe-frame system, collision cache, and real-device QA.

**Risks to avoid**

- No mandatory head bob.
- No strong inertia that causes motion sickness.
- Do not remove labeled controls for players who find virtual joysticks ambiguous.

---

### P0 — Add an accessible spatial model of the room

**Problem**

The object manager makes operations accessible, but a nonvisual player cannot efficiently understand the scene: room regions, free areas, support relationships, adjacency, wall attachment, or camera visibility.

**Change**

Extend **In this room** with:

- a concise overview containing room shape, dimensions, object count, viewpoint, and major open areas;
- stable regions such as front-left, center, back-right, and wall names;
- object descriptions with approximate location, wall/support state, and nearby objects;
- relations such as “Sunday chair, right side, beside desk” or “lamp on bedside table”;
- commands to focus the DOM entry and optionally move the camera to an object;
- reason-specific invalid placement feedback.

**Acceptance criteria**

- A blind test participant can add a chair, place it near the desk, rotate it, and confirm the relationship without sighted help.
- Spatial descriptions update after every committed transform.
- The default summary is concise; relationship and collision detail is available on demand.
- Announcements are throttled and do not flood during held movement keys.
- All operations work at 200% text zoom, in forced colors, and with screen-reader browse mode.
- Approximate relationships use documented confidence rules and never claim false precision.

**Dependencies**

Semantic room regions, cached object bounds, support graph, adjacency rules, and announcement throttling.

---

### P0 — Make placement tactile, deliberate, and explanatory

**Problem**

The ghost and valid/invalid status are strong, but placement can still feel abrupt on touch. Collision uses broad axis-aligned bounds, rotated furniture can report false conflicts, and invalid feedback does not always identify the obstacle or rule.

**Change**

- Let touch/pointer movement inspect the ghost without accidental commitment.
- Confirm with an explicit Place action or deliberate release.
- Show the conflicting footprint/object and a specific reason: overlap, outside room, unsupported, or wrong surface.
- Add cardinal rotation snap and a 15° fine mode.
- Add a restrained 120–220 ms settle response, soft material-aware sound, optional haptic, and immediate Undo affordance.
- Replace generic world AABBs with authored or oriented placement footprints.

**Acceptance criteria**

- Preview reacts within 50 ms.
- Dragging or tapping to position never commits before the documented confirmation gesture.
- Invalid states name the reason and conflicting object where applicable.
- Rotation validation is correct for rotated narrow furniture.
- Reduced-motion replaces settle animation with a static highlight.
- Haptics and sound are optional and never carry unique information.
- Repeated placement remains fast and feedback never blocks the next action.

**Dependencies**

Feedback event bus, authored collider/footprint metadata, audio settings, haptics preference, and command-based undo.

## P1 — Core game layer

### P1 — Add optional Room Stories and inspiration prompts

Room Stories should give direction without judging taste. Examples:

- A rainy-day reading nook.
- A desk for a midnight idea.
- A tiny room for two.
- Make a room from one of your memories.
- Make a calm room using only five objects.
- Turn an awkward L-shaped room into somewhere welcoming.
- Prepare an evening room.
- Create a clear, accessible path through a small room.

Each brief contains a mood, two or three semantic requirements, one optional constraint, a suggested template, a visible checklist, and a scrapbook reward.

**Acceptance criteria**

- Ship at least six handcrafted briefs across several room shapes and play styles.
- Requirements accept multiple valid categories/combinations and never rely on color alone.
- Progress updates immediately and explains what remains.
- Standard stories have no timer or fail state.
- Players can dismiss a story, convert its room to free sandbox, or continue editing after completion.
- Stories work offline and never expire.
- Inspiration increases reported confidence without making the experience feel like chores in usability testing.

**Dependencies**

Catalog tags such as seating, task light, personal, storage, soft furnishing, surface, interaction, style, and mood; plus a transparent rule evaluator.

**Anti-patterns**

No opaque aesthetic score, AI judge, streak, currency, or required posting.

---

### P1 — Make the scrapbook the reward and return spine

Save Photo captures inside the game and associate them with a room, story, and snapshot. Each entry may include room name, date, optional caption, palette, favorite object, before/after pair, milestone, export, and share.

Use expressive milestones such as:

- First room.
- First memory room.
- Made a tiny space work.
- A room in evening light.
- Revisited and changed an old room.

**Acceptance criteria**

- A photo can be saved to the scrapbook in one explicit action.
- Entries remain private/local unless shared, survive reload, and can be viewed, captioned, compared, exported, or deleted.
- Room Story completion creates a stronger but restrained card/reveal.
- The return surface offers one clear **Continue last room** action plus optional scrapbook/variation choices.
- Storage usage, compression, and deletion consequences are visible.
- Progress never depends on external sharing.

**Dependencies**

My Rooms storage, compressed local images, snapshot associations, storage management, and accessible photo metadata.

---

### P1 — Turn Walk into an inhabitable room

Add one consistent Interact action across keyboard and touch. Prioritize high-value object families:

- switch lamps and practical lights;
- sit in chairs or on the bed using authored viewpoints;
- open/close wardrobes, drawers, and doors;
- play/pause radio, record player, stereo, or music box;
- inspect a keepsake and attach a private label or memory;
- water a plant or place a scrapbook photo;
- use desk/computer ambience where appropriate.

**Acceptance criteria**

- At least 12 hero objects across five families support authored interactions.
- A subtle prompt appears only when an interaction is reachable.
- The same intent works through keyboard, touch, and accessible DOM alternative.
- Interactive state persists where appropriate and appears in photos.
- Sitting and animations never trap the player or invalidate editor state.
- The room remains fully usable with no interactive props.
- Interaction feedback begins within 100 ms.

**Dependencies**

Interaction metadata, ray/proximity targeting, persistent per-object state, animation ownership, audio events, and accessible action descriptions.

---

### P1 — Build a unified game-feel and audio system

**Change**

- Replace per-event `AudioContext` creation with one lifetime-owned context.
- Add master, ambience, UI, and world buses with separate music/effects volume.
- Define events for preview, place, rotate, recolor, invalid, remove, undo, photo, story progress, and completion.
- Use restrained material-aware variants for wood, fabric, metal, ceramic, and wall placement.
- Add footsteps and spatial sounds for interactive objects.
- Add optional short haptics and non-audio/non-motion equivalents.
- Pause/resume cleanly on visibility changes without stacking sources.

**Acceptance criteria**

- Exactly one audio context exists per game lifetime and closes on disposal.
- A 200-action soak creates no new contexts, leaked sources, or browser warnings.
- Perceived event latency is under 80 ms.
- Mute/volume settings control every bus and persist locally.
- Ambience loops seamlessly and never duplicates after tab hide/show.
- Primary edit actions have differentiated but quiet feedback.
- Completion is recognizably stronger than an ordinary edit without becoming disruptive.

**Dependencies**

Central feedback/event taxonomy, settings schema, generated/authored audio assets, audio unlock tests, and reduced-motion/haptic preferences.

---

### P1 — Make lighting and atmosphere part of play

**Change**

- Expand Afternoon/Evening into readable afternoon, evening, and night moods.
- Let practical lamps illuminate nearby surfaces and respond to Walk interactions.
- Add cheap exterior depth/sky behind the window.
- Let dust, ambience, window color, and practical lighting respond coherently to the chosen mood.
- Offer particle-free and reduced-camera-motion comfort settings.

**Acceptance criteria**

- Each mood is visibly distinct while dark corners remain readable.
- Toggling a lamp changes nearby light/material response and is visible in Photo mode.
- Transitions settle in 300–600 ms, or switch without motion in reduced-motion mode.
- Particle-free mode produces no ambient dust.
- Lighting stays within the mobile render budget and avoids many shadow-casting point lights.

**Dependencies**

Interactive props, shared material roles, audio/feedback bus, settings, and performance profiling.

---

### P1 — Create and enforce an art bible

Define the miniature’s visual rules:

- world scale and proportion;
- bevel/edge softness;
- silhouette readability at phone scale;
- palette and color roles;
- wood, fabric, painted metal, ceramic, glass, and plastic conventions;
- roughness/metalness ranges;
- seams, thickness, grounding, contact shadow, and detail-density budgets;
- when photographic textures are allowed;
- turntable and active-room asset review.

Fix existing asset inconsistencies as the first pass, including the **Sunday wardrobe center seam/protruding panel**. It should read as a recessed reveal or correctly fitted door edge, not a freestanding dark box in front of the doors.

**Acceptance criteria**

- A one-page art bible is referenced by every model factory.
- Hero furniture is readable at mobile scale and shares coherent material/detail language.
- Asset turntables catch floating parts, bad pivots, z-fighting, protrusions, and inconsistent fronts.
- The Sunday wardrobe has a flush/recessed center reveal with no protrusion from representative camera angles.
- The rug, floor, teddy, furniture, and window share a deliberate abstraction level.
- Visual improvement does not depend on high-resolution textures everywhere.

**Dependencies**

Shared geometry/material kit, asset QA harness, camera turntables, and performance budgets.

---

### P1 — Add comfort, readability, and simplified-control settings

Provide:

- UI/text scale;
- high-contrast mode;
- reduced camera motion;
- hide dust/ambient particles;
- master, music/ambience, and effects volume;
- simplified controls;
- labeled-icon mode;
- optional read-aloud prompts/object names when platform support permits.

Simplified copy should say **Move onto a wall** instead of **Align to wall**, and **Backup room file** instead of exposing XML terminology.

**Acceptance criteria**

- Settings apply immediately, persist locally, and are fully keyboard/screen-reader accessible.
- The game remains usable at 200% UI scale on desktop and mobile.
- Simplified mode hides advanced controls through progressive disclosure without making existing work inaccessible.
- Music can be muted while keeping useful placement feedback.
- Every setting participates in automated responsive/accessibility regression coverage.

**Dependencies**

Versioned settings schema, shared tokens, audio bus, particle ownership, and visual regression matrix.

---

### P1 — Make dense rooms and long sessions reliable

**Change**

- Cache authored local bounds and transformed world bounds.
- Maintain `Map<id, ItemData>` instead of repeated linear searches.
- Use a simple spatial hash or broadphase for placement and Walk collision.
- Invalidate bounds only on transform, scale, or model changes.
- Move resize work to `ResizeObserver` and cache pointer/media-query state.
- Sample diagnostics at 2–5 Hz behind a test/dev gate rather than rebuilding them every frame.
- Pause rendering on hidden pages and reduce idle editor refresh.
- Add adaptive DPR/quality based on sustained frame time.

**Acceptance criteria**

- With 200 placed objects, collision/update work stays at or below 3 ms in the target scenario.
- Desktop target: p95 frame time ≤16.7 ms in a 100-object room.
- Mid-tier mobile minimum: p95 ≤33.3 ms; starter room should aim for 45–60 FPS.
- No interaction long task exceeds 100 ms; catalog opening has no more than one task over 50 ms.
- Default scene stays ≤120 calls; 100-object target stays ≤180 calls through resource sharing/instancing.
- Furnished-room visible triangle target remains within approximately 75k–100k.
- Geometry count stays below 200 in a 100-object room where practical.
- Diagnostics report p50/p95/p99, long tasks, calls, triangles, geometries, textures, and active quality tier.

**Dependencies**

Collider metadata, performance fixtures, production-mode profiler, dirty-frame scheduling, and preserved test hooks.

## P2 — Depth and mastery

### P2 — Add power-user editing tools behind Precision tools

- Multi-select and grouping.
- Lock/hide objects.
- Copy/paste across rooms.
- Align/distribute.
- Configurable grid increments.
- Numeric position, rotation, scale, and dimensions.
- Named layers/groups.
- Camera bookmarks.
- Measurement/ruler overlay.
- Duplicate with offset and repeated placement.

**Acceptance criteria**

- Every operation supports keyboard, pointer, touch, and undo.
- Locked objects cannot be moved accidentally.
- Group transforms preserve relative positions and support relationships.
- Numeric values expose units and understandable validation errors.
- A 100-object room remains responsive.
- Casual players do not see the full complexity unless they enable Precision tools.

**Dependencies**

Command/history architecture, multi-selection model, serializer migration, object locking, and scalable collision.

---

### P2 — Improve catalog discovery through themes and context

Add curated collections such as:

- Cozy reading corner.
- Music room.
- Study setup.
- Plant-filled room.
- Sleepover.
- Real-room essentials.
- Recently added.
- Fits selected surface.
- Fits available space.
- Surprise me.

**Acceptance criteria**

- A casual player or child can make a coherent fantasy without knowing an item name.
- Collections never hide the complete catalog.
- Cards state item count and approximate space needs.
- Recently added is accurate rather than manufactured novelty.
- Recommendations stay local and require no behavioral profiling.
- Thumbnail work is cancellable, cached by asset version, and consumes no more than 8 ms in a frame.

**Dependencies**

Semantic tags, free-space estimation, asset versioning, and thumbnail scheduling/prebaking.

---

### P2 — Add optional challenge variants and expressive progression

Potential challenges:

- Tiny Room.
- Five Things Only.
- One Palette, with non-color alternatives.
- Awkward Floor Plan.
- Reuse the Starter Furniture.
- Accessible Layout with a clear route.
- Photo Challenge for a requested mood/view.

Good progression rewards broaden expression:

- material/color variants;
- scrapbook papers, frames, and title treatments;
- additional templates and environmental moods;
- curated object collections;
- interaction variants and soundscapes.

**Acceptance criteria**

- Constraints and success rules are visible before starting and explain unmet conditions precisely.
- Starting a challenge duplicates rather than mutates an existing room.
- Every challenge can be abandoned without penalty and continued freely.
- Essential tools and representative furniture remain immediately available.
- Every unlock has a visible local path and cannot be purchased.
- Repeating one trivial action does not accelerate progression.
- No streak, expiry, ranking, or loss aversion is used.

**Dependencies**

My Rooms duplication, semantic rule evaluator, scrapbook milestones, and transparent progress storage.

---

### P2 — Share editable designs safely

Start with a compressed room package or URL fragment suitable for static hosting. Consider backend sharing only when the local flow proves valuable.

**Acceptance criteria**

- A received design opens in a preview before creating or replacing local data.
- Imported rooms always receive a new local ID unless the player explicitly chooses otherwise.
- Roundtrip preserves room shape, finishes, transforms, support relationships, interaction state, and metadata.
- Invalid or oversized data fails safely.
- Shared data contains no personal identifiers by default.
- Editable-room sharing is separate from screenshot sharing.
- XML remains available as an offline backup.

**Dependencies**

Versioned schema, compression/size limits, preview mode, import validation, and privacy copy.

---

### P2 — Harden Photo mode for a long-lived scrapbook

**Acceptance criteria**

- Offer explicit Standard and High export quality.
- Standard capture completes in under 1.5 s; High completes in under 3 s on target devices.
- Incremental mobile memory remains within a measured 96–128 MB budget.
- Allocation/readback failure falls back gracefully without WebGL context loss.
- Twenty consecutive captures on an iOS-class device do not crash or leak resources.
- Before/after capture and room thumbnail generation reuse the same safe pipeline.

**Dependencies**

Real iPhone Safari tests, capture memory instrumentation, compressed IndexedDB storage, and context-loss handling.

---

### P2 — Replace transparent wall sorting with a robust dollhouse cutaway

**Problem**

All walls use transparency and near walls fade to low opacity. This can cause ordering artifacts, overlapping dark segments, lost wall-mounted items, or inconsistent shadows in irregular rooms.

**Acceptance criteria**

- Near walls become cleanly absent, dithered, or clipped while far walls stay opaque.
- Rectangle, L, T, and U rooms show no double-dark overlaps or transparent sorting artifacts.
- Wall-mounted objects remain understandable when their host wall is cut away.
- Cutaway behavior does not add unnecessary transparent draw cost.
- Camera rotation never hides all orientation landmarks at once.

**Dependencies**

Wall-group visibility policy, dither/clipping or authored cutaway treatment, shadow rules, and visual regression views for all shapes.

## P3 — Future community layer

Only consider a curated community showcase after My Rooms, snapshots, scrapbook, Room Stories, accessible spatial descriptions, and safe sharing are mature.

If introduced:

- private/unlisted must be the default;
- nothing uploads without explicit confirmation;
- images must strip metadata;
- no public comments or direct messages at launch;
- reporting, moderation, deletion, and data export must exist before public availability;
- child users must never publish publicly by default;
- geographic or personal room information must not be inferred or exposed.

Community is a moderation and safeguarding product, not a lightweight retention feature.

## Recommended implementation sequence

### Phase 1 — Trust, framing, and first success

1. Versioned My Rooms persistence and migration.
2. Durable save/pagehide/quota recovery.
3. Responsive camera safe frame.
4. First-session guided creative victory.
5. Accessible spatial room overview.
6. Mobile Walk simplification.
7. Deliberate tactile placement.

**Exit gate:** a novice on desktop or mobile and a keyboard/screen-reader user can create a new room, place and edit an object, understand where it is, enter Walk, take a photo, and return without risking another design.

### Phase 2 — The cozy game loop

1. Semantic catalog tags and transparent brief evaluator.
2. Six Room Stories/inspiration cards.
3. Local scrapbook with captions and milestones.
4. Continue/revisit/try-another-version return surface.
5. Unified audio/feedback event system.

**Exit gate:** the product delivers inspiration → making → remembering with no score, pressure, or external account.

### Phase 3 — Inhabit the room

1. Walk movement and collision overhaul.
2. Unified Interact intent.
3. Twelve interactive hero objects across five families.
4. Practical lights, spatial audio, sitting, open/close, and keepsake interactions.
5. Afternoon/evening/night atmosphere pass.

**Exit gate:** Walk is a meaningful payoff for design choices, not only a camera mode.

### Phase 4 — Coherence and scale

1. Art bible and shared material/geometry kit.
2. Sunday wardrobe seam fix and hero-prop QA.
3. Cached bounds, spatial broadphase, maps, and diagnostics throttling.
4. Adaptive render schedule and quality tier.
5. 100/200/500-object fixtures and long-session soak tests.

**Exit gate:** the visual language is coherent and a 100-object room meets device budgets without compromising playability.

### Phase 5 — Mastery and sharing

1. Precision tools, grouping, locks, rulers, and camera bookmarks.
2. Themed/contextual collections.
3. Optional challenge variants and expressive unlocks.
4. Editable room sharing with preview and privacy protections.
5. Hardened scrapbook photo pipeline.
6. Robust dollhouse wall cutaway.

**Exit gate:** power users gain depth without exposing casual players to unnecessary complexity.

## QA and playtest matrix

### Personas

- Casual decorating fan.
- Child/young player with an adult present.
- Non-gamer/first-time 3D user.
- Returning power user.
- Keyboard-only player.
- Screen-reader user.
- Low-vision player at 200% UI scale.
- Reduced-motion and particle-free player.
- Mobile touch player in portrait and landscape.

### Devices and scenarios

- Desktop Chromium and Safari-class browser.
- 1024×768 laptop and 1440×900 desktop.
- 768×1024 tablet.
- 320×568 and 390×844 phones.
- Representative short landscape phone.
- Real iPhone Safari and mid-tier Android hardware.
- 10-, 100-, 200-, and 500-object rooms.
- 30-minute edit/Walk soak.
- Twenty consecutive photo captures.
- Storage quota failure and page close inside the save debounce window.
- WebGL context loss/restoration.
- Tab hide/show with ambience and held movement.

### Critical end-to-end tasks

1. Create a second room without altering the first.
2. Complete or skip the first guided story.
3. Place, edit, undo, and remove through pointer, touch, keyboard, and accessible object manager.
4. Confirm spatial relationship without relying on the canvas.
5. Enter Walk, move/look, interact, take a photo, and exit.
6. Save a scrapbook entry, reload, and revisit it.
7. Restore a snapshot after a destructive change.
8. Import/share into preview without overwriting local data.
9. Change comfort/audio settings and verify they persist.
10. Stress a furnished room and capture performance diagnostics.

### Automated release gates

- Build/typecheck and CSS validation.
- No serious accessibility violations in welcome, editor, My Rooms, Walk, Photo, scrapbook, or settings.
- Focus trap/return and closed-surface inertness.
- Keyboard, touch, pointer-cancel, blur, and visibility-change input tests.
- Camera safe-frame bounds assertions against UI occlusion.
- Four-wall/cutaway regression for rectangle, L, T, and U rooms.
- Versioned save migration, snapshot recovery, pagehide flush, and quota failure.
- Semantic story evaluation and non-color alternatives.
- Room-package import validation and roundtrip.
- Audio unlock, single-context soak, mute, buses, loop cleanup, and visibility behavior.
- Nonblank canvas and active desktop/mobile screenshots.
- p50/p95/p99 frame time, long tasks, calls, triangles, geometries, textures, collision cost, and quality tier.
- Real-device photo memory/repetition checks.

## Performance and reliability budgets

- Placement preview response: ≤50 ms.
- Walk input response: ≤100 ms.
- Audio event latency: <80 ms.
- Desktop 100-object room: p95 ≤16.7 ms.
- Mid-tier mobile: p95 ≤33.3 ms minimum; starter room aims for 45–60 FPS.
- Collision/update in a 200-object room: ≤3 ms.
- No interaction task >100 ms.
- Catalog open: <200 ms, with at most one task >50 ms.
- Default scene: ≤120 draw calls.
- 100-object furnished room: ≤180 draw calls and <200 geometries where practical.
- Visible furnished-room triangle budget: approximately 75k–100k.
- Adaptive mobile DPR: approximately 1.0–1.5/1.7 based on sustained p95.
- Editor ready after Open the door: <2 s on a 4G mid-tier profile.
- Normal-session mobile memory target: ≤200 MB.
- Incremental photo capture target: ≤96–128 MB.
- Committed save durable: ≤500 ms plus synchronous/transactional page-exit flush.
- One audio context, zero duplicate ambience sources, and zero leaked nodes after soak.

## Success metrics

Use privacy-respecting, aggregated, preferably opt-in measurement. Do not optimize raw session length.

- Welcome-to-first-placement conversion.
- Median time to first placement.
- Completion of place → edit → Walk → Photo in the first session.
- Percentage reaching a first creative victory in under three minutes.
- Walk exits within 10 seconds, indicating confusion or discomfort.
- Percentage of edited rooms that receive a scrapbook photo.
- Rooms, snapshots, and photos created per player.
- Return to a previous room rather than only starting fresh.
- Room Story starts, completions, skips, and abandonment steps.
- Sandbox versus guided-story usage.
- Placement cancellation and invalid-reason frequency.
- Catalog searches with zero results.
- Accessibility task success with keyboard, screen reader, 200% scale, reduced motion, and touch.
- Self-reported calm, creative confidence, control comprehension, sense of ownership, and desire to return.

The healthier north-star outcome is:

> **“I made something meaningful, preserved it, and left satisfied.”**

not “the player stayed as long as possible.”

## Definition of a stronger game

This roadmap is complete when:

- free sandbox remains immediately available;
- new players can reach a satisfying first creation without external help;
- multiple rooms and snapshots make experimentation safe;
- mobile framing and Walk controls preserve the room as the focus;
- nonvisual players can understand meaningful spatial relationships;
- Room Stories inspire but never judge or pressure;
- Walk interactions make decorating choices experiential;
- Photo and scrapbook preserve the emotional payoff;
- feedback, audio, lighting, and art direction feel coherent and tactile;
- 100-object rooms meet desktop/mobile budgets;
- saves survive page exit and storage failures visibly;
- power tools remain progressively disclosed;
- sharing is private, explicit, and non-destructive;
- no score, streak, currency, competition, or aesthetic judgment compromises the calm creative identity.

