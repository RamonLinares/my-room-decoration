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
- TODO: Continue checking dense-room placement as the catalog grows; consider a temporary placement silhouette if rooms become extremely full.
