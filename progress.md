Original prompt: Build and deploy a polished, playable “My Room decoration” web game where users can add, remove, modify, stack, and resize room objects.

- 2026-07-12: Added collision-aware inventory spawning. New objects search outward from the visible center for an unoccupied floor position and fall back to the least-overlapping valid position when the room is crowded.
- 2026-07-12: Made selection explicit with a warm, pulsing additive outline around every mesh composing the selected object, plus a subtle emissive lift.
- 2026-07-12: Added Lower/Raise controls (0.2-unit steps, 0–6 range) and R/F keyboard shortcuts. Raising support furniture carries supported objects with it; directly adjusting a supported prop detaches it for free height placement.
- 2026-07-12: Fixed horizontal dragging to preserve custom object height. Dragging now occurs on the elevation where the object started instead of always projecting onto the floor.
- 2026-07-13: Added reference-based procedural BILLY and PAX/KOMPLEMENT storage props. BILLY includes the six-bay rhythm, back, plinth, pin holes, and books; PAX includes an open wardrobe bay, rail, framed drawer fronts, runners, and an articulated pulled-out drawer.
- 2026-07-13: Added live inventory search and a compact collapse state that keeps the panel header accessible. Search automatically broadens to All categories and keyboard shortcuts are suppressed while typing.
- 2026-07-13: Rebuilt the keyboard set's mouse with a rounded shell, base, split buttons, center seam, and scroll wheel. Re-anchored chair and armchair backs at the seat-back junction so their tops lean rearward around a believable pivot.
- 2026-07-13: Applied the same seat-level rearward back pivot to the rolling desk chair.
- 2026-07-13: Removed the redundant inventory collapse control and restyled close buttons. Added persistent room width/depth sliders with cozy, square, wide, and deep presets. Rebuilt room architecture parametrically and replaced fixed drag clamps with object-footprint-aware boundaries so furniture can sit flush against the picture wall and back wall.
- 2026-07-13: Converted the built-in memory rug, sunny window, picture-frame trio, and wall book shelf into ordinary catalog objects. A one-time migration adds editable versions to existing saves; they can now be selected, moved, resized, recolored, duplicated, and permanently removed without returning after reload.
- 2026-07-13: Rebuilt Sunny window glazing with a double-sided physical clearcoat pane, luminous sky backing, and reflected highlight streaks so newly added catalog copies read as glass even away from a wall.
- TODO: Continue checking dense-room placement as the catalog grows; consider a temporary placement silhouette if rooms become extremely full.

## Gaming experience roadmap implementation (2026-07-15)

- Original goal: Implement every item in `gaming_xp_roadmap.md` efficiently and completely, without shortcuts; verify locally and in production; push and deploy.
- Completed P0 trust foundations: versioned IndexedDB My Rooms, thumbnails, archive/recovery, bounded snapshots, import safety, first-session creative victory, safe-frame camera presets, robust mobile Walk controls, accessible spatial overview, tactile placement feedback, and four-wall dollhouse cutaways.
- Completed P1 core loop: six optional Room Stories, scrapbook capture/compare/captions, 61-kind Walk interactions, generated ambience/UI/world/footstep audio through one context owner, four smoothly blended lighting moods, an enforced art bible, comfort/readability settings, and adaptive quality for dense rooms.
- Completed P2 depth: precision multi-edit/group/lock/measure/repeat tools, curated catalog collections and contextual discovery, six non-punitive challenge variants, safe editable share previews with ID remapping, and adaptive standard/high photo capture with context-loss fallback.
- Kept P3 community deliberately gated as the roadmap specifies: local-first sharing is complete, while any public showcase requires a separate moderation, privacy, reporting, age-policy, and safeguarding product review.
- Corrected the Sunday wardrobe center seam so it is recessed rather than protruding. Added four real room walls; the camera-near walls cut away cleanly while far walls remain fully opaque for rectangle, L, T, and U layouts.
- Generated and integrated a storybook memory-box concept and PBR GLB. Runtime optimization reduced it from 58.06 MB / 1,023,836 uploaded vertices / 4K maps to 2.0 MB / 64,225 vertices / 1K maps.
- Final production build: 40.04 kB HTML, 55.34 kB CSS, 687.09 kB game chunk (185.49 kB gzip), lazy 44.29 kB GLTF loader, and 242.04 kB Three.js core.
- Final QA: `154 passed`, `6 intentional platform skips`, `0 failed` across desktop Chrome and mobile Safari emulation; 20-capture iOS-class photo soak and 100/200/500-object fixtures pass. Stylelint and `git diff --check` pass.
- Final runtime sample: high quality, 0.70 ms p50 / 1.10 ms p95 / 1.60 ms p99 frame work, 20 collision cells, nonblank canvas, four wall diagnostics (`back=1`, `left=1`, `front=0`, `right=0`), and no console or page errors.
- Release evidence and the ten-category before/after visual scorecard are recorded in `gaming_xp_release_report.md`.
- Hardened the Pages verification path after independent GitHub runner feedback: production keeps `/my-room-decoration/`, CI's Vite development server stays at `/`, the browser harness resolves consistently, 200% text controls retain a safe viewport inset, and readiness assertions follow actual editor/Walk transitions without relaxing gameplay or performance thresholds.

## Professional UI redesign (2026-07-15)

- Rebuilt the editor chrome from the supplied design reference: compact room identity card, restrained top-right history/audio controls, dark toy-chest masthead, cream inventory body, raised mode tabs, and a slimmer bottom dock.
- Compressed catalog discovery into a single search/filter row with horizontally scannable categories and curated collections, preserving every existing filter and keyboard interaction.
- Reworked catalog entries into dense two-column visual cards with thumbnail, title, note, favorite, preview cue, and primary Place cue. The 3D room remains visually dominant at laptop dimensions.
- Tuned short desktop viewports so four complete product cards remain visible at 1280×720; taller laptop viewports use larger product imagery and reveal six or more entries.
- Responsive and interaction verification now passes across desktop Chrome and mobile Safari emulation, including compact landscape, 200% text, reduced motion, forced colors, keyboard management, catalog filtering, placement, cancel, commit, and undo.
- Corrected catalog card alignment inherited from the former flex layout: the grid now owns a full-width column, removing the large phantom left inset from thumbnails, titles, notes, and actions.
- Promoted Rotate, Height, and Size into compact grouped selection controls; More now contains only color, duplicate, camera, wall alignment, and removal actions.
- Added Lower/Raise controls directly to placement preview with a live height value and R/F shortcuts, allowing shelves and other objects to clear existing wall/floor arrangements before committing.
- Verified the streamlined controls across desktop and mobile Safari emulation: 20 targeted placement, responsive, keyboard, 200%-text, and accessibility tests pass with no UI overflow or console errors.
- Fixed repeated rotation drift near room edges. Rotations now preserve the object's exact x/z center; a turn whose rotated footprint would cross a wall is refused with guidance instead of silently clamping and moving the object. Added a 24-turn regression for the Double glass cabinet on desktop and mobile.

## Ant visual-gap closure (2026-07-15)

- Added a shared cozy material library with authored woven upholstery and tintable procedural wood. The 1K fabric source is shipped as a 52 kB WebP and loads progressively after the welcome screen so visual polish does not compete with LCP.
- Rebuilt the most visible foundational props—bed, desk, chair, lamp, teddy, books, sofa, sectional, and armchair—with rounded silhouettes, layered construction, recognizable details, coherent fabric/wood response, and practical lamp glow.
- Rebalanced all four lighting moods around a lower ambient floor, stronger directionality, softer PCF shadows, restrained exposure, and local lamp light. The default camera moved from 36° to 40° for a more natural dollhouse perspective.
- Recompressed desktop chrome around the canvas: the identity card is 326×69, catalog is ~310 px wide (19% of a 1440×900 viewport), eight catalog cards are visible, and the dock is 328 px wide. Mobile retains 44 px targets and a full-width bottom dock without covering the room.
- Replaced per-submesh selection scribbles with one calm object-level outline and lighter emissive feedback. Rotate, Height, and Size remain immediately visible.
- Made automatic placement search the actual room grid in both primary orientations, preventing tall furniture and shelves from opening on top of the teddy in furnished rooms.
- Kept visual detail inside the original production envelope by concentrating geometry at silhouettes: final default-room diagnostics are 100 calls, 5,242 triangles, 101 geometries, 7 textures, high quality, 1.0 ms p50 / 1.5 ms p95 frame work, and no console/page errors.
- Verification: production build and Stylelint pass; the final clean Playwright run reports `158 passed`, `6 intentional platform skips`, and `0 failed` across desktop Chrome and mobile Safari emulation. This includes render budget, throttled LCP, complete responsive matrix, desktop/mobile placement, 24-turn cabinet rotation, touch gestures, Walk/photo, the 20-capture iOS soak, and all four wall cutaway shapes.

## Wall- and surface-aware placement (2026-07-15)

- Replaced floor-hit “nearest rectangle edge” inference with a reusable boundary-wall solver. It removes shared interior edges in L/T/U room unions, represents inward-facing wall segments explicitly, and raycasts only walls visible to the pointer.
- Wall-mounted objects now choose a clear slot on the longest usable boundary, face into the room, clamp within the wall span and room height, retain their wall identity when saved, and stay attached while dragged, nudged, aligned, or re-snapped after room changes.
- Promoted the original window, frame trio, and wall bookshelf fixtures to explicit wall-placement catalog entries so they receive the same constraints as the expanded catalog and real-room wall pieces.
- Surface props now search several usable positions across every support instead of attaching to the first support found. Pointer placement clamps the whole object footprint within the support top, ignores its host during collision checks, and rejects a drop when no valid support remains.
- Placement feedback now names the active wall or support, and diagnostics expose placement surface, wall side, and support ID for automated verification and accessibility tooling.
- Added regressions for shaped-room interior-edge removal, clear wall-slot selection, persisted wall attachment, and support-required surface placement on desktop and mobile.
- Prevented the catalog-closing pointer transition from dragging a valid automatic preview onto an occupied object; deliberate canvas taps and placement moves remain immediate. Floor fallback scoring now uses exact transformed obstacle boxes, including asymmetric models.
- Hardened photo opening for throttled/background tabs with a bounded rAF fallback and a persistent shutter-effect diagnostic marker.
- Final verification: production build, Stylelint, diff integrity, and canvas inspection pass. The contention-free Playwright run reports `164 passed`, `6 intentional platform skips`, and `0 failed` across all 170 desktop/mobile cases. Default-room diagnostics remain at 100 calls, 5,242 triangles, 101 geometries, 7 textures, 1.1 ms p50 / 1.6 ms p95, with a nonblank canvas and no console/page errors.
