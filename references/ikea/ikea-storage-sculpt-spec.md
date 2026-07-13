# IKEA storage procedural sculpt specification

Intended use: stylized, browser-real-time room-decoration props viewed at miniature scale. The models are approximate procedural reconstructions, not exact IKEA production meshes.

## Reference assessment

### BILLY 80 × 28 × 202 cm

- Suitability: pass.
- Scores (0–3): object isolation 3, silhouette readability 3, depth inference 3, primitive decomposition 3, material procedurality 3, occlusion risk 3, interaction fit 3.
- Complexity: moderate repeated-structure hard-surface static prop.
- Quality contract: preserve the narrow 0.396 width/height ratio, shallow 0.139 depth/height ratio, six open bays, thin back panel, projecting side stiles, recessed toe-kick/plinth, shelf-pin rows, and matte paper-foil response. Minimum structure: 2 side panels, top/bottom, 5 internal shelves, back, plinth, two pin-hole repetition systems, and shelf contents for miniature readability.
- Critical review targets: tall narrow silhouette; six-bay rhythm; shallow depth; plinth; visible shelf-pin rows.

### PAX frame with KOMPLEMENT framed-front drawers

- Suitability: conditional. The drawer reference is isolated and clear, while the surrounding PAX frame is inferred from the official 50 × 35 × 201 cm frame and wardrobe-combination references.
- Scores (0–3): object isolation 3, silhouette readability 3, depth inference 3, primitive decomposition 3, material procedurality 3, occlusion risk 2, interaction fit 3.
- Complexity: moderate articulated repeated-structure hard-surface prop.
- Quality contract: preserve the tall PAX carcass, deeper cabinet proportion, open upper wardrobe bay, rail and shelf, three framed-front KOMPLEMENT drawers, recessed inner panels, side walls, runners, and one slightly pulled-out drawer to reveal drawer depth. Each drawer remains a distinct pivot group for future sliding animation.
- Critical review targets: PAX carcass proportions; repeated framed drawer fronts; drawer depth; open upper bay; pulled-out top drawer.

## Shared material and action contract

- Warm-white paper foil: base color near `#eeeae0`, roughness 0.72–0.82, metalness 0, subtle face-to-edge tonal variation.
- Drawer runners/rail: desaturated metal, roughness about 0.45, metalness about 0.55.
- Coordinate frame: +Y up, +Z front, root pivot at floor center.
- Collider intent: whole-object box proxy; shelves and drawer fronts remain separate meshes.
- Destruction policy: non-breakable room props; component boundaries are retained for future disassembly.
- Performance target: under 150 meshes combined, no external runtime textures, stable mobile rendering.

## Build passes and acceptance

1. Blockout: proportions and bounding silhouettes read correctly in the room.
2. Structural: shelves, back, plinth, frame, rail, drawer pivots, and repeated front frames are present without floating joints.
3. Form: small edge offsets, recessed panels, pin holes, runners, and drawer pull-out depth read at game camera distance.
4. Material/lighting: warm-white foil separates from the room walls and contact shadows preserve depth.
5. Interaction/optimization: selection glow covers all components; movement, scaling, rotation, height, saving, and mobile controls remain functional.

## Sources

- BILLY official product reference: https://www.ikea.com/us/en/p/billy-bookcase-white-20522046/
- BILLY Spain series/dimensions: https://www.ikea.com/es/en/cat/billy-series-28102/
- PAX 50 × 35 × 201 cm frame: https://www.ikea.com/es/en/p/pax-wardrobe-frame-white-20458210/
- KOMPLEMENT framed-front drawer: https://www.ikea.com/us/en/p/komplement-drawer-with-framed-front-white-10446604/
- PAX/KOMPLEMENT wardrobe combination: https://www.ikea.com/es/en/p/pax-wardrobe-combination-s09503134/

## Final visual review

### BILLY — optimization pass

- Estimated fidelity: 0.84; decision: continue/accept for miniature game scale.
- Layer scores: silhouette/proportion 0.91, component structure 0.88, form detail 0.80, material surface 0.76, lighting/camera 0.84.
- Feature scores: tall narrow silhouette 0.94; six-bay rhythm 0.91; shallow depth 0.88; plinth 0.84; shelf-pin system 0.72; miniature shelf contents 0.90.
- Notes: silhouette and shelf rhythm strongly match. Pin rows were enlarged after the first comparison; they remain intentionally subtle at the default room camera. The warm-white foil is stylized to separate it from the wall.
- Evidence: `output/playwright/billy-render-final.png`, `output/playwright/billy-comparison-final.png`.

### PAX/KOMPLEMENT — optimization pass

- Estimated fidelity: 0.82; decision: continue/accept for miniature game scale.
- Layer scores: silhouette/proportion 0.86, component structure 0.89, form detail 0.82, material surface 0.76, lighting/camera 0.83.
- Feature scores: PAX carcass 0.88; open upper bay 0.91; rail and hanging contents 0.86; repeated framed drawer fronts 0.87; pulled-out drawer/depth 0.78; pin-hole system 0.82.
- Notes: the implementation deliberately represents one compact bay from the larger official PAX combination. Drawer groups retain separate slide pivots and the upper drawer is offset forward to reveal depth.
- Evidence: `output/playwright/pax-render-final.png`, `output/playwright/pax-comparison-final.png`.
