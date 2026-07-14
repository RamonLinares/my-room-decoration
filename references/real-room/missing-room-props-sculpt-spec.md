# Missing real-room props sculpt spec

Source evidence: `Photo 1.jpg`, `Photo 2.jpg`, and `Photo 3.jpg` supplied on 2026-07-14.

## Suitability and scope

Verdict: pass for stylized browser-real-time props. The three photos provide readable silhouettes and scale cues, but the unseen backs and exact dimensions are inferred.

| Target | Isolation | Silhouette | Depth | Primitive decomposition | Material | Occlusion | Interaction |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Radiator | 2 | 3 | 2 | 3 | 3 | 2 | 3 |
| Lucky-bamboo vase | 2 | 3 | 2 | 3 | 2 | 2 | 3 |
| Wastebasket | 2 | 3 | 2 | 3 | 3 | 3 | 3 |
| Oak armchair | 3 | 3 | 3 | 3 | 2 | 2 | 3 |
| Built-in wardrobe | 2 | 3 | 2 | 3 | 3 | 2 | 3 |
| Interior door | 2 | 3 | 2 | 3 | 3 | 2 | 3 |

## Pre-spec assessment

The set mixes repeated hard-surface, transparent-like, botanical-like, fabric-like, and bent timber forms. Overall complexity is moderate: six static props, shallow hierarchies, repeated radiator fins/wardrobe panels/leaves, and white paint, oak, cloth, glass, water, foliage, and matte plastic materials.

## Quality contract

Done means every target is independently selectable from the My room catalog, reads correctly at the editor camera distance, sits on or against the expected room surface, exposes a whole-object bounding-box collider, and stays within the existing procedural visual language.

Critical systems:

- Radiator: nine separated tall white fins, recessed dark gaps, top vents, and visible wall/pipe attachment.
- Plant: tall ringed cane rooted in a clear cylindrical vase, visible green-tinted water, and an irregular crown of pointed leaves.
- Chair: thick cream seat/back cushions enclosed by a continuous warm-oak side frame with connected rear legs, front legs, arms, and lower rail; no floating joints.
- Wardrobe: floor-to-ceiling white built-in mass with three lower and three upper panel doors, narrow reveals, trim, and round black knobs.
- Door: white framed leaf with horizontal panel lines, black lever, and black hinges.

Important systems:

- Wastebasket: tapered matte-black shell, open dark interior, and pale-blue liner folded over the rim.
- Materials: cloth is high-roughness warm beige; oak is warm mid-brown with restrained clearcoat; painted fixtures are warm white; glass and water use separate transparent physical materials.

Failure modes: wrong silhouette/proportion, fewer or merged radiator fins, chair frame gaps, missing wardrobe panel rhythm, opaque vase, floating foliage, white instead of black bin, or missing black hardware.

Review viewpoints: editor three-quarter view for the full set; close three-quarter view for chair; frontal wall view for radiator and wardrobe/door; front/side view for the vase crown.

Performance budget: fewer than 200 new draw calls for all six props together, shared materials within each factory call, low-segment primitives, no external textures, and bounding-box collision metadata.
