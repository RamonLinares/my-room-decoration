Original prompt: Build and deploy a polished, playable “My Room decoration” web game where users can add, remove, modify, stack, and resize room objects.

- 2026-07-12: Added collision-aware inventory spawning. New objects search outward from the visible center for an unoccupied floor position and fall back to the least-overlapping valid position when the room is crowded.
- 2026-07-12: Made selection explicit with a warm, pulsing additive outline around every mesh composing the selected object, plus a subtle emissive lift.
- 2026-07-12: Added Lower/Raise controls (0.2-unit steps, 0–6 range) and R/F keyboard shortcuts. Raising support furniture carries supported objects with it; directly adjusting a supported prop detaches it for free height placement.
- 2026-07-12: Fixed horizontal dragging to preserve custom object height. Dragging now occurs on the elevation where the object started instead of always projecting onto the floor.
- 2026-07-13: Added reference-based procedural BILLY and PAX/KOMPLEMENT storage props. BILLY includes the six-bay rhythm, back, plinth, pin holes, and books; PAX includes an open wardrobe bay, rail, framed drawer fronts, runners, and an articulated pulled-out drawer.
- 2026-07-13: Added live inventory search and a compact collapse state that keeps the panel header accessible. Search automatically broadens to All categories and keyboard shortcuts are suppressed while typing.
- TODO: Continue checking dense-room placement as the catalog grows; consider a temporary placement silhouette if rooms become extremely full.
