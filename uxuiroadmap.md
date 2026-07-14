# UX/UI Roadmap — My Little Room

Last reviewed: 14 July 2026
Reviewed experience: [GitHub Pages deployment](https://ramonlinares.github.io/my-room-decoration/)

## Implementation status

Completed on 14 July 2026. Every P0–P3 workstream in this roadmap is represented in the editor, including the accessible object manager, inert/modal focus management, four-action responsive dock, intentional ghost placement, consistent touch gestures, catalog discovery and faithful previews, compact selection inspector, progressive Room sections, Walk guidance, precision tools, local optimized assets, semantic design tokens, and automated release gates.

Validation covers desktop Chromium and mobile WebKit, the full responsive viewport matrix, keyboard-only operation, automated accessibility checks, 200% text zoom, reduced motion, forced colors, touch gestures, canvas output, near-wall transparency, render budgets, and a measured welcome LCP below 2.5 seconds under a throttled mobile-class profile. The GitHub Pages build is also smoke-tested at its production `/my-room-decoration/` base path.

## Purpose

This roadmap combines four complementary reviews:

1. A desktop UX/UI specialist review at 1024×768, 1280×720, and 1440×900.
2. A mobile/tablet UX/UI specialist review at 390×844, 768×1024, and 844×390.
3. An accessibility and design-system review against the deployed site and source.
4. A direct product review of the live welcome flow, catalog, editor, and responsive controls.

The priorities below reflect user impact, frequency, and whether an issue blocks the core room-building task. Accessibility blockers are treated as release blockers even when the pointer-driven experience remains usable.

### Priority definitions

- **P0 — Release blocker:** prevents a group of users from completing the core task.
- **P1 — Fix next:** materially harms task completion, discovery, or mobile usability.
- **P2 — Important:** improves clarity, efficiency, precision, and comfort.
- **P3 — Refinement:** strengthens polish, consistency, and long-term maintainability.

## Executive summary

The site already has a distinctive, warm identity and a surprisingly complete feature set. Its strongest qualities are the storybook art direction, inviting 3D room, forgiving undo/autosave foundation, touch-aware layout, Walk mode, and polished Photo mode.

The largest usability risk is that the interface has outgrown its current navigation model. There are 154 catalog items, seven global actions, nine selected-object actions, several long panels, and multiple immersive modes. On desktop this creates density and discoverability problems; on mobile it causes clipped controls and competing gestures. For keyboard and screen-reader users, the canvas-only editing model and visually hidden but still focusable panels block the primary workflow.

The recommended direction is to:

- provide an accessible object-management surface alongside the canvas;
- make closed panels genuinely inactive and make modal focus behavior correct;
- replace the clipped mobile dock with four primary actions plus **More**;
- teach object placement and touch gestures through short, contextual first-use guidance;
- redesign the catalog around discovery, recent use, favorites, and faithful previews;
- simplify selected-object controls into a compact inspector;
- consolidate responsive rules and reusable visual tokens;
- add a small regression suite covering keyboard, assistive technology, touch, responsive layout, and performance.

## Strengths to preserve

- Cohesive “storybook miniature” visual language across type, color, cards, shadows, and the 3D scene.
- A clear, inviting welcome message that fits well on a phone viewport.
- Large primary controls; most close buttons and major touch targets already meet 44×44 px.
- Safe-area inset handling, `100dvh`, contained scrolling, and coarse-pointer controls provide a good mobile foundation.
- Undo/redo and autosave reduce fear of experimentation.
- Room resizing preserves objects rather than destructively clearing the scene.
- Walk mode is immersive and provides desktop movement guidance.
- Photo mode has a strong capture, preview, retake, resolution, download, and share flow.
- Several controls already use accessible names, `aria-pressed`, and status regions.
- A reduced-motion stylesheet foundation already exists.

## Prioritized roadmap

### P0 — Make the core editor keyboard- and screen-reader-operable

**Problem**

The WebGL room is exposed as a generic canvas named “Your miniature room.” A keyboard or screen-reader user cannot discover the placed objects, select one, or understand its position and state. Shortcuts can change an object only after pointer-based selection, so the core add → select → edit → save workflow is not independently operable.

**Change**

- Add an **Objects in room** DOM panel/list containing every placed object as a named control.
- Expose selected state and actions for move X/Z, rotate, raise/lower, resize, color, duplicate, and remove.
- Prefer ordinary buttons or a well-tested listbox/roving-tabindex pattern; do not rely on `role="application"` alone.
- Add arrow-key nudging, with Shift for larger increments.
- Add `aria-keyshortcuts` and a visible shortcuts/help surface.
- Announce selection and meaningful changes through one concise `role="status"` region, for example: “Sunday chair selected; rotated 30 degrees.”
- Ensure add, undo, save, open, and error outcomes are also announced once.

**Acceptance criteria**

- With keyboard and a screen reader, a tester can add an item, select it, move it, rotate it, recolor it, duplicate it, delete it, undo, save, and reload.
- No pointer gesture is required for the core workflow.
- Selected object, action result, and error state are spoken without repetitive announcements during continuous movement.
- The canvas remains available as the rich visual workspace; the DOM surface complements it rather than replacing it.

---

### P1 — Remove closed UI from focus and implement correct modal behavior

**Problem**

Catalog, Room, Load & Save, selection controls, and dismissed welcome content are hidden with opacity, transforms, and `pointer-events`. Their descendants remain keyboard-focusable and exposed to assistive technology. At 390×844, the accessibility review found 165 focusable catalog descendants after closing it, 41 in the Room panel, four in Load & Save, nine in the hidden selection toolbar, and one in the dismissed welcome panel. The Walk HUD is marked `aria-hidden="true"` while containing focusable buttons.

The welcome overlay is visually modal but is not implemented as a complete modal dialog. Photo mode declares a modal dialog but does not fully trap focus or make the background inert.

**Change**

- Toggle native `hidden` or `inert` for inactive panels, synchronized with `aria-hidden` where useful.
- For animated closing, apply `inert` immediately and `hidden` after the transition.
- Add `aria-controls` and `aria-expanded` to panel openers.
- Move focus into an opened panel and restore it to its opener on close or Escape.
- Make the mobile panel modal when it obscures the workspace; desktop side panels may remain non-modal.
- Implement Welcome with `role="dialog"`, `aria-modal="true"`, a labelled heading, initial focus on **Open the door**, background inert, Escape behavior where appropriate, and complete removal after dismissal.
- Trap focus in Photo mode, make the background inert, support Escape, and restore focus to **Photo**.
- Do not put focusable Walk controls inside an `aria-hidden` ancestor.

**Acceptance criteria**

- Tab never lands in a visually closed, off-screen, or transparent control.
- A test finds zero focusable descendants inside `[hidden]`, `[aria-hidden="true"]`, `.closed`, `.hidden`, or `.gone` containers.
- Focus cannot escape a modal with Tab or Shift+Tab.
- Escape and Close restore focus to the invoking control.
- The accessibility tree excludes background content while a modal is active.

---

### P1 — Replace the clipped mobile dock

**Problem**

At 390 px, only **Objects**, **Room**, **Load & Save**, and **Walk** are clearly visible. **Photo** is clipped and **Afternoon** and **Home** are completely off-screen. Horizontal scrolling has no cue, so critical actions appear missing. In landscape, the full dock consumes roughly three quarters of the screen width.

**Change**

- Use four persistent mobile actions: **Objects**, **Room**, **Walk**, and **More**.
- Put Save/Open, Photo, lighting, and Reset view inside a compact, labelled More sheet.
- Preserve an obvious active state for the current mode.
- Use a compact icon-plus-label layout in landscape and keep controls away from the focal center and safe areas.
- Avoid horizontal scrolling for primary navigation.

**Acceptance criteria**

- At 320–430 CSS px, every action is either visible or reachable from one clearly labelled **More** action.
- No horizontal scrolling is required to discover global actions.
- All targets are at least 44×44 px and keyboard focus is never obscured.
- At least 70% of landscape height remains visually useful for the room.
- Rotating the device preserves mode, selection, camera, and panel state.

---

### P1 — Resolve tablet panel/dock collisions and consolidate responsive rules

**Problem**

At 768×1024, the desktop-style inventory remains open while the dock overlays its lower cards. The switch at 700 px is abrupt. The stylesheet contains overlapping mobile media queries that alternately specify a 47vh/three-column catalog and a much taller/two-column catalog, making the final behavior difficult to predict and maintain.

**Change**

- Keep the bottom-sheet panel pattern through approximately 899 px, validated by content rather than device labels.
- Alternatively, collapse/hide the dock whenever an editor panel is open between 700 and 900 px.
- Consolidate responsive behavior into a documented set of breakpoints and remove conflicting declarations.
- Reserve at least 16 px between panels and persistent controls.
- Reframe the 3D camera to the remaining canvas whenever a desktop side panel opens.

**Acceptance criteria**

- From 700–900 px portrait, the dock never covers catalog cards, room controls, status text, or scroll affordances.
- Opening a panel leaves an intentional, useful room preview area.
- The full room remains framed when a desktop side panel opens.
- Each responsive rule has one clear owner; no later media query silently reverses the layout model.

---

### P1 — Teach first placement and prevent surprising room mutations

**Problem**

Selecting a catalog card immediately creates an object at an application-chosen position. The welcome copy says objects can be moved, turned, and recolored, but it does not explain click-to-add, selection, drag placement, contextual controls, or undo. New furniture can appear in an inconvenient location or obstruct the initial Walk view.

**Change**

- Add a short first-use sequence: choose an object → preview/ghost follows the intended placement → click or tap the floor to place → drag to move → undo if needed.
- Separate browsing from committing with an explicit **Add** action or a placement preview.
- Show one-time contextual hints for select, move, rotate, resize, and undo.
- Choose collision-aware spawn positions and keep the default Walk camera sightline clear.
- Let users dismiss guidance and reopen it from Help.

**Acceptance criteria**

- A first-time user can add and reposition an object without trial and error.
- Browsing the catalog does not unexpectedly mutate the room.
- A new object never spawns outside the room, intersects major furniture, or blocks the initial Walk view.
- Hints disappear after successful use and do not continuously reappear.

---

### P1 — Make touch gestures consistent and forgiving

**Problem**

Touching an object enters drag state immediately, so a normal tap with slight finger drift can move furniture. Pinch changes meaning depending on selection: it scales the selected object, but otherwise zooms the camera. That invisible context switch makes accidental resizing likely and forces users to deselect before reliably zooming.

**Change**

- Separate tap-to-select from drag-to-move with a 6–10 CSS px movement threshold.
- Do not change coordinates or create an undo checkpoint before the threshold is crossed.
- Reserve pinch for camera zoom everywhere.
- Put object resizing in visible Larger/Smaller controls or transform handles.
- If pinch-to-resize is retained, require an explicit visible transform mode and explain it on first use.

**Acceptance criteria**

- A tap selects without changing object coordinates.
- Small involuntary movement does not reposition an object or pollute undo history.
- Dragging feels immediate once the threshold is crossed.
- The same pinch gesture produces the same result unless a clearly visible mode is active.
- Users can zoom the room without first deselecting an object.

---

### P1 — Redesign catalog discovery for 154 items

**Problem**

The catalog has outgrown a two-column list and horizontally clipped category strip. On phone, labels appear as “Furnitu,” “Worksp,” and “Memor.” On desktop, later categories—including the personally relevant **My room**—depend on unlabelled horizontal scrolling. Generic emoji do not always predict the actual 3D object. Tabbing through 154 item buttons is exhausting.

**Change**

- Use intrinsic-width category pills with 12–16 px horizontal padding; never truncate category names.
- Add a visible overflow cue such as a right-edge fade, partially visible next pill, or previous/next buttons.
- Scroll the selected category fully into view.
- Promote **My room**, **Recently used**, and **Favorites** near the front.
- Add placement-type and size filters and sorting by recent/name.
- Replace or augment emoji with thumbnails or faithful hover previews of the actual 3D models.
- Keep search, category, result count, and panel close controls sticky.
- Use roving tabindex or a virtualized/arrow-navigable result grid so browsing does not require 154 Tabs.

**Acceptance criteria**

- Every category is visibly discoverable without prior knowledge of horizontal scrolling at 320 px and 1024 px.
- No category label is clipped at 320–430 px.
- A returning user reaches a recent or **My room** object in two actions or fewer.
- Each card preview resembles its scene model.
- Search and category state remain visible while results scroll.
- Keyboard browsing does not require one Tab press per catalog item.

---

### P1 — Fix contrast, focus visibility, and tiny text

**Problem**

Several small-text color pairs do not reliably reach WCAG AA: active category white on sage is approximately 4.19:1, catalog summary text approximately 4.38:1, and search placeholder approximately 3.85:1. Topbar text sits on a changing 3D scene, so its contrast cannot be guaranteed. Some persistent labels are around 10–11.5 px. Search removes its outline without a replacement, and the custom color input lacks an obvious focus treatment.

**Change**

- Darken or adjust semantic foreground/background tokens until small text reaches at least 4.5:1.
- Add a stable translucent or opaque scrim behind topbar text and actions.
- Use at least 14 px for action labels and 12 px for secondary helper text.
- Make room-name editing reachable through a target at least 44 px high.
- Add a shared `:focus-visible` treatment for buttons, inputs, editable name, sliders, and custom swatches.
- Use `#catalog-search:focus-within` and an explicit focused custom-swatch state.
- Verify non-text boundaries and focus indicators at 3:1.

**Acceptance criteria**

- Deterministic UI text passes 4.5:1 and meaningful control boundaries pass 3:1.
- Text over the lightest and darkest room scenes remains readable.
- Every interactive element has a visible focus indicator at least 2 px thick and 3:1 against adjacent colors.
- At 200% text zoom, labels and actions do not clip or disappear.

---

### P1 — Reduce initial mobile payload and show perceived progress

**Problem**

The reviewed build includes approximately 696 KB of JavaScript, a 3.4 MB rug texture, and a 3.4 MB favicon. Photo-only assets may load before Photo is opened, and there is no branded loading state before the welcome experience becomes ready.

**Change**

- Resize and compress the favicon to under 100 KB.
- Resize and convert the rug texture to a modern web format, targeting under 300 KB where quality permits.
- Lazy-load Photo-only assets when Photo is opened.
- Split nonessential catalogs/object factories where it produces a measurable startup gain.
- Render a lightweight branded loading response immediately.
- Add busy/progress feedback for any room rebuild, restore, filter, or capture operation exceeding 300 ms.

**Acceptance criteria**

- Photo-only assets are absent from the initial network request set.
- A branded loading response appears within 100 ms.
- Target LCP is under 2.5 seconds on a representative mid-tier phone over Slow 4G.
- Repeated actions are disabled while an operation is busy.
- Success and error feedback remains visible long enough to read and is announced once.

---

### P2 — Simplify the selected-object controls

**Problem**

Selection currently exposes nine actions immediately above a seven-item global dock. On phone this becomes a large multi-row overlay with roughly 10 px labels and obscures the room. On desktop, two similarly styled pill rows make global and contextual actions hard to distinguish. Rotation direction is subtle, and Remove sits close to reversible controls.

**Change**

- Group controls into **Transform**, **Appearance**, and **More**.
- Keep Rotate, Size, Duplicate, and Delete as the most visible mobile actions; move height, color, and infrequent actions into an expandable inspector/bottom sheet.
- On desktop, consider a compact right-side inspector for the selected object.
- Use clear icon-plus-label controls, tooltips, and shortcut labels.
- Show the selected object name on mobile rather than removing all context.
- Separate Delete visually and keep it recoverable through Undo.
- Replace a blind “Color” cycle with a named palette popover and current-color feedback.

**Acceptance criteria**

- Users distinguish global navigation from selected-object actions at a glance.
- Action text is at least 12–14 px and primary actions fit without clipping.
- Rotation direction is unambiguous.
- The room remains visible enough to judge the selected object.
- Delete does not require a precision tap, is separated from adjacent actions, and is undoable.

---

### P2 — Restructure long panels

**Problem**

The 154-item catalog and Room settings are long surfaces. Close controls can scroll away. At 1280×720, Room settings require internal scrolling and floor settings fall below the initial fold. Users receive little indication that more controls exist.

**Change**

- Keep panel title and Close sticky at all scroll positions.
- Keep catalog Search and selected category sticky without consuming excessive height.
- Split Room into collapsible **Dimensions**, **Walls**, and **Floor** sections.
- Show the active section and support progressive disclosure.
- Consider resizable side panels on desktop.
- Optionally support a clearly signposted swipe-down-to-close gesture on phone.
- Make browser/device Back close an active panel before leaving the app where platform behavior permits.

**Acceptance criteria**

- Close is reachable at every panel scroll position.
- At 1280×720, it is visually clear that additional room controls exist below the fold.
- No panel content is covered by the dock.
- The active Room section remains identifiable while scrolling.

---

### P2 — Improve Walk mode entry and touch guidance

**Problem**

Walk can begin behind furniture. Entering the mode abruptly removes editor chrome and pauses editing without explanation. Desktop keyboard help is present, but explanatory text is hidden on touch devices, leaving the directional pad, drag-to-look surface, zoom, and camera height to be discovered by accident.

**Change**

- Find the nearest collision-free Walk spawn with a useful sightline.
- Show a brief desktop message: “Walk mode — editing paused; Esc exits.”
- Show a one-time touch hint: “Use the pad to move · drag the room to look.”
- Visually group Movement, Look, and Camera controls.
- Ensure two-thumb move-and-look works reliably.
- Preserve and restore the previous orbit camera and selected object on exit.
- Add subtle visual or audio feedback when movement is blocked.

**Acceptance criteria**

- Walk starts in open space with at least 60% of the view unobstructed.
- A new touch user can move, look, zoom, change height, and exit without desktop instructions.
- Controls avoid safe areas and do not cover the reticle.
- Escape reliably exits on desktop and the previous camera/selection is restored.
- The hint is dismissible and does not repeatedly reappear.

---

### P2 — Add precision placement and visible transform feedback

**Problem**

Dragging is approachable, but users cannot align furniture reproducibly or see numeric rotation, height, or scale. There is no clear valid/invalid placement feedback, wall alignment, or optional snapping.

**Change**

- Add optional grid, room-edge, and object snapping.
- Add arrow-key nudging and Shift-modified larger steps.
- Show compact live values for rotation, height, scale, and optionally position.
- Highlight collisions/invalid placement in red and valid placement in green.
- Offer **Align to wall** for appropriate objects.
- Let users disable snapping.

**Acceptance criteria**

- Users can align two objects or place an object flush to a wall reproducibly.
- Invalid placement is identifiable before release.
- Transform values are visible and keyboard-adjustable.
- Snapping can be turned off.

---

### P2 — Expose selected/filter state without relying on color

**Problem**

Catalog categories and some room presets use visual color changes without consistently exposing selected state to assistive technology. Room shape controls are better and already use `aria-pressed`. Color cycling provides no named current state.

**Change**

- Use `aria-pressed` consistently, or use radio-group semantics for mutually exclusive presets.
- Add a checkmark, border, or text state in addition to color.
- Announce the resulting color/pattern name.
- Verify selection styles in forced-colors mode.

**Acceptance criteria**

- A screen reader announces selected category, preset, and color.
- Selected state remains visible without color perception and in forced-colors mode.

---

### P2 — Improve names, landmarks, and structure

**Problem**

Undo and Redo are exposed as arrow glyphs rather than word labels. The editable room name overrides its heading semantics with `role="textbox"`, leaving the deployed document without a true H1. Sidebars are unnamed complementary landmarks. Sliders do not always communicate useful labels and units. On phone the room name truncates heavily, and the pencil is not a robust standalone edit target.

**Change**

- Add `aria-label="Undo"` and `aria-label="Redo"`.
- Preserve one true H1 and provide a separate Rename button/input or an editing mode that does not remove heading semantics.
- Give Catalog and Room landmarks unique names via `aria-labelledby`.
- Associate range labels explicitly and provide `aria-valuetext` with units.
- Make the room name a coherent 44 px edit target; allow a controlled two-line display or a compact title that expands into a dedicated field.
- Provide a way to reveal the full truncated name.

**Acceptance criteria**

- The document has exactly one H1.
- Landmarks have unique, descriptive names.
- Undo and Redo are announced as words.
- Sliders announce label, value, and unit.
- Medium-length room names remain understandable and editable without colliding with topbar controls.

---

### P2 — Make desktop shortcuts discoverable

**Problem**

The editor supports Q/E rotation, R/F elevation, Delete/Backspace, Escape, and Ctrl/Cmd+Z, but only Walk shortcuts are explained.

**Change**

- Add a keyboard-shortcuts popover opened with `?` and from Help.
- Include shortcuts in toolbar tooltips and menu labels.
- Prevent editor shortcuts from firing while the user edits the room name, search, or another text field.

**Acceptance criteria**

- Every supported shortcut is discoverable in the editor.
- Relevant tooltips show the shortcut.
- Selected objects can be nudged precisely without a mouse.
- Text editing never triggers room actions.

---

### P2 — Clarify action and status wording

**Problem**

**Home** resets the camera rather than navigating home. **Afternoon** can read as either the current lighting state or an action. “Save XML” is implementation terminology. Autosave is transient rather than a persistent saved/unsaved state. Desktop Share may fall back to a download.

**Change**

- Rename **Home** to **Reset view** or **Fit room**, with a camera/frame icon and tooltip.
- Present lighting as a stateful selector, for example **Lighting: Afternoon**.
- Rename file actions to **Save room file** and **Open room file**, with XML described secondarily.
- Add a subtle persistent state near the title: **Saving**, **Saved**, or **Error**.
- Where native sharing is unsupported, make **Download PNG** the primary action and omit or de-emphasize Share.

**Acceptance criteria**

- Users can predict the Reset view action before activating it.
- Current lighting and save state are visible without clicking.
- File terminology is understandable without technical knowledge.
- Unsupported Share is not presented as though it will open a share destination.

---

### P2 — Complete reduced-motion behavior

**Problem**

Reduced-motion styles remove many transitions, but scripted camera easing and the Photo flash/iris sequence can still run.

**Change**

- Under `prefers-reduced-motion: reduce`, disable flash/iris effects, drawer/camera easing, and nonessential scene motion.
- Replace motion-based Photo feedback with a brief static busy/status state.
- Ensure first-use hints do not depend on animated movement.

**Acceptance criteria**

- With reduced motion emulated, no nonessential CSS animation, transition, or scripted camera easing runs.
- Photo capture still communicates progress and completion without a flash.

---

### P3 — Add a coherent design-system layer

**Problem**

Colors, elevation, radii, typography, target size, and interaction states are repeated as literal values. The CSS has overlapping declarations and at least one suspicious extra closing brace near the panel-close rules, increasing regression risk.

**Change**

- Create semantic tokens such as `--surface`, `--surface-raised`, `--text`, `--text-muted-aa`, `--focus`, `--selected`, `--danger`, `--target-min`, and elevation/radius scales.
- Define component state contracts: default, hover, focus, pressed, selected, disabled, busy, and error.
- Add forced-colors/high-contrast styles.
- Consolidate duplicated media queries and add CSS linting to CI.
- Add visual regression fixtures for docks, drawers, dialog, catalog card, selection controls, and room presets.

**Acceptance criteria**

- Dock, drawers, and dialogs use documented shared tokens.
- Component tests cover focus, selected, disabled, busy, error, forced-colors, and mobile states.
- CSS linting reports no syntax errors or conflicting duplicate blocks.

---

### P3 — Add gentle gesture and state affordances

**Problem**

Canvas orbit, object drag, category overflow, bottom-sheet behavior, and pinch are mostly learned by accident. Important operations such as restoring a complex room or rebuilding dimensions can lack progress feedback.

**Change**

- Add one-time hints for orbit, selection, drag, and zoom.
- Use visible overflow cues for every horizontal scroller.
- Announce add/remove/save/restore success and errors through throttled status regions.
- Prevent repeated taps while an operation is processing.
- Keep hints available from Help after dismissal.

**Acceptance criteria**

- First-use hints disappear after the corresponding successful action.
- Every horizontal scroller visually communicates overflow.
- Operations exceeding 300 ms show a busy state.
- Reduced-motion preferences remain respected.

## Recommended implementation sequence

### Phase 1 — Inclusive release gate

1. Add the keyboard/screen-reader Objects in room surface.
2. Fix `hidden`/`inert` state, modal traps, focus restoration, and the Walk HUD accessibility conflict.
3. Replace the clipped mobile dock.
4. Add Undo/Redo names and selected-state semantics.
5. Add automated checks for off-screen focus and modal behavior.

**Exit gate:** a keyboard and screen-reader user can complete the core room task; all primary actions work at 320 px; no hidden control receives focus.

### Phase 2 — Mobile interaction foundation

1. Resolve the 700–900 px tablet collision and consolidate breakpoints.
2. Add tap-versus-drag threshold.
3. Reserve pinch for zoom or introduce an explicit transform mode.
4. Redesign the phone selection toolbar.
5. Add sticky panel headers and touch Walk guidance.
6. Compact the landscape layout.

**Exit gate:** no clipped navigation, accidental tap movement, gesture ambiguity, or covered panel content across the mobile matrix.

### Phase 3 — Discovery and onboarding

1. Redesign catalog categories, previews, Recent, Favorites, and My room.
2. Add preview/ghost placement and safe spawn logic.
3. Add first-use editing guidance and a Help/shortcuts surface.
4. Rework the long Room panel into progressive sections.

**Exit gate:** a new user can find, add, place, adjust, and undo an object without guessing.

### Phase 4 — Visual accessibility and communication

1. Correct contrast and introduce a stable topbar surface.
2. Complete focus-visible styling.
3. Raise microcopy and action-label sizes.
4. Clarify Reset view, lighting, file, save-state, and photo wording.
5. Complete reduced-motion and forced-colors support.

**Exit gate:** AA contrast, visible focus, 200% text zoom, reduced motion, and forced colors pass the manual QA matrix.

### Phase 5 — Precision, performance, and polish

1. Optimize favicon/rug assets and lazy-load Photo resources.
2. Add progress states and measure Slow 4G startup.
3. Add snapping, nudging, collision feedback, and numeric transforms.
4. Improve Walk spawn and camera restoration.
5. Consolidate design tokens, responsive CSS, linting, and visual regression tests.

**Exit gate:** representative mobile LCP is under 2.5 seconds, expensive operations communicate progress, and precision tools remain optional and understandable.

## QA and validation matrix

### Viewports

- Phone portrait: 320×568, 360×800, 390×844, 430×932.
- Phone landscape/coarse pointer: 667×375 and 844×390.
- Tablet portrait: 768×1024 and 834×1194.
- Compact desktop: 1024×768 and 1280×720.
- Large desktop: 1440×900 and 1920×1080.

### Interaction modes

- Mouse and trackpad.
- Touch only.
- Keyboard only.
- Screen reader: VoiceOver on Safari and NVDA on Chrome/Firefox.
- 200% text zoom.
- `prefers-reduced-motion: reduce`.
- Forced colors/high contrast.
- Slow 4G and a representative mid-tier phone CPU profile.

### Critical end-to-end tasks

1. Dismiss Welcome and understand how to begin.
2. Find a specific object and add it intentionally.
3. Select, move, rotate, resize, recolor, duplicate, and delete it.
4. Undo and redo.
5. Change room dimensions, walls, and floor.
6. Save a room file, open it again, and recover from an invalid file.
7. Enter and exit Walk while preserving the prior editor state.
8. Capture, retake, download, and—where supported—share a photo.
9. Change lighting and reset the camera view.
10. Repeat the core editing task with keyboard and screen reader.

### Suggested automated coverage

- Accessibility scan on Welcome, main editor, open Catalog, open Room, open Save/Open, Photo, and Walk states.
- Test that closed/hidden containers have no focusable descendants.
- Keyboard-only Playwright flow for add → select → transform → delete → undo → save/open.
- Modal Tab/Shift+Tab/Escape/focus-return tests.
- Responsive screenshots for the viewport matrix.
- Tests for 200% text zoom, reduced motion, and forced colors.
- Bundle and asset budget checks.
- CSS linting and component visual regression.

## Success metrics

- At least 80% of first-time users add and correctly reposition an object without external help.
- At least 90% correctly predict what **Reset view** does before using it.
- Median time to find a recently used or My room object is under 15 seconds.
- Accidental object moves from simple taps are eliminated in touch testing.
- All global actions are discoverable at 320 px without horizontal scrolling.
- Zero critical or serious automated accessibility findings in key application states.
- No keyboard trap or off-screen focus in manual testing.
- Complete keyboard and screen-reader core task with no pointer dependency.
- Deterministic UI meets WCAG AA contrast; focus indicators meet 3:1.
- Representative mobile LCP is under 2.5 seconds on Slow 4G.

## Immediate quick wins

These can begin while the larger interaction work is designed:

1. Add word-based accessible names to Undo and Redo.
2. Rename Home to Reset view.
3. Add a visible focus style for search and custom color.
4. Stop category-label truncation and add a horizontal overflow cue.
5. Make panel headers sticky.
6. Add a 6–10 px touch drag threshold.
7. Make closed panels `inert` immediately.
8. Compress the oversized favicon and rug texture.
9. Raise selection and dock label sizes.
10. Add CSS linting and remove duplicate/conflicting responsive rules.

## Release definition of done

A release should be considered UX-ready when:

- the primary room-building task is independently usable with mouse, touch, keyboard, and screen reader;
- no closed or modal-background control can receive focus;
- every global action is visible or clearly reachable at 320 px;
- phone, tablet, landscape, compact desktop, and large desktop layouts pass without overlap or clipped labels;
- text, focus, selected states, reduced motion, and forced colors meet the acceptance criteria above;
- first placement and Walk mode are understandable without experimentation;
- performance budgets and the critical end-to-end regression suite pass.
