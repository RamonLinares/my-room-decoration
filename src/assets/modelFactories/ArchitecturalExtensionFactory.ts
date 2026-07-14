import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type ArchitecturalKind = "balconydoor";

export const ARCHITECTURAL_KINDS = new Set<string>(["balconydoor"]);

export const ARCHITECTURAL_SIZES: Record<
  ArchitecturalKind,
  { width: number; depth: number }
> = {
  balconydoor: { width: 5.2, depth: 3.5 },
};

const mesh = (
  parent: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  name: string,
) => {
  const part = new THREE.Mesh(geometry, material);
  part.name = name;
  part.position.set(x, y, z);
  part.castShadow = true;
  part.receiveShadow = true;
  parent.add(part);
  return part;
};

const box = (
  parent: THREE.Group,
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  name: string,
) =>
  mesh(
    parent,
    new RoundedBoxGeometry(
      width,
      height,
      depth,
      2,
      Math.min(0.055, width / 10, height / 10, depth / 8),
    ),
    material,
    x,
    y,
    z,
    name,
  );

export function buildArchitecturalDoor(
  root: THREE.Group,
  kind: string,
  color: number,
) {
  if (!ARCHITECTURAL_KINDS.has(kind)) return false;
  const trim = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).lerp(new THREE.Color(0xf2e5cf), 0.72),
      roughness: 0.78,
    }),
    dark = new THREE.MeshStandardMaterial({
      color: 0x51372c,
      roughness: 0.72,
    }),
    brass = new THREE.MeshStandardMaterial({
      color: 0xb9944f,
      roughness: 0.28,
      metalness: 0.68,
    });

  box(root, 0.2, 4.35, 0.28, trim, -1.34, 2.175, 0, "left-door-frame");
  box(root, 0.2, 4.35, 0.28, trim, 1.34, 2.175, 0, "right-door-frame");
  box(root, 2.88, 0.2, 0.28, trim, 0, 4.25, 0, "door-lintel");
  box(root, 2.75, 0.1, 0.56, dark, 0, 0.05, 0.03, "threshold");

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xb9d9dc,
    transparent: true,
    opacity: 0.38,
    roughness: 0.08,
    clearcoat: 1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const side of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.name = "open-balcony-door";
    leaf.position.set(side * 1.2, 0, 0.02);
    leaf.rotation.y = side * 0.7;
    root.add(leaf);
    const center = side * -0.58;
    box(leaf, 1.14, 3.84, 0.08, glass, center, 2.08, 0, "balcony-glass");
    box(leaf, 0.09, 3.95, 0.15, trim, center - 0.55, 2.08, 0.04, "door-stile");
    box(leaf, 0.09, 3.95, 0.15, trim, center + 0.55, 2.08, 0.04, "door-stile");
    for (const y of [0.16, 1.42, 2.72, 4.02])
      box(leaf, 1.15, 0.09, 0.15, trim, center, y, 0.04, "door-rail");
    mesh(
      leaf,
      new THREE.CylinderGeometry(0.035, 0.035, 0.5, 10),
      brass,
      side * -1,
      2.05,
      0.16,
      "balcony-handle",
    );
  }
  return true;
}

export function buildArchitecturalExtension(
  _kind: ArchitecturalKind,
  _wallColor: number,
  floorColor: number,
) {
  const root = new THREE.Group();
  root.name = "Generated balcony";
  root.userData.architecturalExtension = true;
  const metal = new THREE.MeshStandardMaterial({
    color: 0x4f554f,
    roughness: 0.48,
    metalness: 0.42,
  });

  const { width, depth } = ARCHITECTURAL_SIZES.balconydoor;
  const stone = new THREE.MeshStandardMaterial({
    color: new THREE.Color(floorColor).lerp(new THREE.Color(0xd5c8af), 0.58),
    roughness: 0.9,
  });
  box(root, width, 0.3, depth, stone, 0, -0.15, -depth / 2, "balcony-floor");
  const rail = (
    width: number,
    x: number,
    y: number,
    z: number,
    vertical = false,
  ) =>
    box(
      root,
      vertical ? 0.09 : width,
      vertical ? 1.35 : 0.09,
      0.09,
      metal,
      x,
      y,
      z,
      vertical ? "railing-post" : "railing-rail",
    );
  for (const x of [-width / 2, -width / 4, 0, width / 4, width / 2])
    rail(0, x, 0.72, -depth, true);
  for (const y of [0.55, 1.35]) rail(width, 0, y, -depth);
  for (const x of [-width / 2, width / 2]) {
    box(root, 0.09, 0.09, depth, metal, x, 1.35, -depth / 2, "side-handrail");
    for (const z of [-0.65, -1.45, -2.25, -3.05]) rail(0, x, 0.72, z, true);
  }
  const terracotta = new THREE.MeshStandardMaterial({
      color: 0xaa6247,
      roughness: 0.9,
    }),
    green = new THREE.MeshStandardMaterial({
      color: 0x577557,
      roughness: 0.88,
    });
  for (const x of [-1.85, 1.85]) {
    mesh(
      root,
      new THREE.CylinderGeometry(0.34, 0.27, 0.52, 12),
      terracotta,
      x,
      0.26,
      -2.75,
      "balcony-pot",
    );
    for (let i = 0; i < 5; i++) {
      const leaf = mesh(
        root,
        new THREE.SphereGeometry(0.22, 9, 6),
        green,
        x + Math.sin(i * 2.1) * 0.2,
        0.66 + (i % 2) * 0.17,
        -2.75 + Math.cos(i * 1.7) * 0.14,
        "balcony-plant",
      );
      leaf.scale.set(0.6, 1.6, 0.5);
    }
  }
  return root;
}
