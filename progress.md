Original prompt: Build and deploy a polished, playable “My Room decoration” web game where users can add, remove, modify, stack, and resize room objects.

- 2026-07-12: Added collision-aware inventory spawning. New objects search outward from the visible center for an unoccupied floor position and fall back to the least-overlapping valid position when the room is crowded.
- TODO: Continue checking dense-room placement as the catalog grows; consider a temporary placement silhouette if rooms become extremely full.
