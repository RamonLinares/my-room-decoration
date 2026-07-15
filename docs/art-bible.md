# My Little Room — Art Bible

## North star

The room should feel like a hand-built storybook miniature: warm, tactile, slightly imperfect, and clear enough to read on a phone. Detail supports memory and interaction; it never chases photorealism at the expense of cohesion or performance.

## Scale and silhouette

- One world unit reads as approximately one metre in Walk mode.
- Doors and tall storage establish human scale; small props must remain recognizable from the default dollhouse camera.
- Primary silhouette must read before texture or emissive detail.
- Hero props use primary form, secondary construction, and a small amount of tertiary detail visible at phone scale.
- Thin parts have believable thickness. Furniture must not float; use legs, plinths, or subtle contact treatment.

## Geometry language

- Use softened edges, bevels, rounded profiles, tapers, curves, and layered trim where they affect silhouette or highlights.
- Repeated boxes are construction blocks, not finished assets. Add frames, seams, handles, hinges, rails, cushions, or functional breaks.
- Door reveals and panel seams are recessed or flush. They never read as freestanding bars pasted onto a cabinet front.
- Place pivots at real joints for drawers, doors, lids, rockers, and lamps so interaction animation remains believable.
- Name interactive child meshes and animation pivots.

## Material roles

| Role | Visual rule |
| --- | --- |
| Painted wood | Warm off-white or muted color, roughness 0.62–0.82, softly highlighted edges |
| Natural wood | Warm grain direction implied through form/low-cost texture, roughness 0.52–0.76, no plastic shine |
| Fabric | Broad soft value, roughness 0.88–1.0, seams/piping visible through geometry or restrained texture |
| Metal | Small functional accents, metalness 0.55–0.9, roughness 0.28–0.58; never an entire room of chrome |
| Ceramic/glass | Selective physical material, clear silhouette and thickness, limited transmission/overdraw |
| Plastic/electronics | Slightly cooler, roughness 0.38–0.65, controlled highlights, readable buttons/screens |
| Dark contact | Deep warm neutral used under furniture and inside reveals; never a protruding decorative stripe |
| Practical light | Emissive source plus a measured nearby light/contact response; avoid whole-object glow |

Reuse named material roles. Avoid one-off materials when an existing role and color tint can serve the object.

## Palette

- Foundation: cream paper, warm oak, muted terracotta, faded sage, dusty blue, honey gold, soft charcoal.
- Reward/valid: deep sage plus shape/text feedback.
- Invalid/warning: muted brick red plus footprint/reason text.
- Interactive focus: honey light with a visible shape cue.
- Night scenes retain warm practical lights and readable blue-grey shadow values; no crushed black corners.

## Lighting and atmosphere

- One principal shadow light establishes direction and grounding.
- Hemisphere/fill light preserves readable forms.
- Practical lights use emissive meshes and limited local illumination; only high-value lights cast dynamic shadows.
- Afternoon, evening, and night have distinct color temperature, exterior color, ambience, and particle behavior.
- Dust is sparse, optional, and disabled by reduced-particle settings.
- Fog/background create depth but never hide missing geometry.

## Texture policy

- Procedural/shared textures are preferred for floors, wallpaper, repeated trim, and low-value support surfaces.
- Generated or photographic textures are reserved for high-value surfaces and must be palette-aligned and stylized to match the miniature world.
- Opaque runtime textures use WebP/AVIF where practical; transparent UI assets use optimized PNG/WebP.
- Avoid baked hard shadows, extreme contrast, or photographic detail that conflicts with simplified geometry.
- Texture dimensions and memory are recorded; no unique full-resolution texture for a tiny prop.

## Interaction states

- Idle: still or very subtle authored motion.
- Available: restrained honey focus cue and accessible prompt.
- Active: visible physical state change—lamp on, drawer open, record turning, seated viewpoint.
- Placement preview: translucent authored model plus footprint and reason text.
- Placement settle: 120–220 ms soft settle or static highlight under reduced motion.
- Invalid: conflicting footprint/object identified without relying on color.

## UI/world cohesion

- UI uses the same paper, oak, terracotta, sage, honey, and charcoal roles as the room.
- Story and scrapbook surfaces feel like cards kept from the room, not generic dashboard panels.
- Icons are simple and readable at 16–24 px; unfamiliar actions retain text labels.
- Motion is short, soft, and tied to state.

## Asset quality gate

Before an asset ships, inspect it in a turntable and in the active desktop/mobile room:

- silhouette reads at intended distance;
- scale and pivot are correct;
- front/up orientation is consistent;
- no floating parts, protruding seams, z-fighting, or inverted faces;
- doors/drawers/lids rotate or translate from believable pivots;
- materials match named roles;
- collision/placement proxy is separate and documented;
- important parts have stable names;
- geometry/material/texture cost is recorded;
- the asset remains recognizable in the mobile screenshot.

## Performance budgets

- Default room: no more than 120 draw calls.
- Furnished 100-object room: target no more than 180 draw calls and 200 geometries through sharing/instancing.
- Visible furnished-room budget: approximately 75k–100k triangles.
- Use high segments only where they improve a silhouette.
- Scope shadows, transparent surfaces, and physical materials to visible value.
- Generated hero assets require a simple authored collider, measured file/triangle/material/texture cost, and a fallback state.
