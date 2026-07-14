import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { REAL_ROOM_KINDS } from "../../data/realRoomCatalog";

export function buildRealRoomProp(root: THREE.Group, kind: string, color: number) {
  if (!REAL_ROOM_KINDS.has(kind)) return false;

  const white = new THREE.MeshStandardMaterial({ color: 0xf3f2ed, roughness: 0.68 });
  const warmWhite = new THREE.MeshStandardMaterial({ color: 0xe6dfd2, roughness: 0.82 });
  const black = new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.48 });
  const charcoal = new THREE.MeshStandardMaterial({ color: 0x34383d, roughness: 0.62 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xaab0b4, roughness: 0.3, metalness: 0.72 });
  const wood = new THREE.MeshStandardMaterial({ color: 0xb88149, roughness: 0.66 });
  const accent = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
  const screen = new THREE.MeshStandardMaterial({ color: 0x10151c, roughness: 0.22, metalness: 0.12 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xd9edf0,
    transparent: true,
    opacity: 0.28,
    roughness: 0.07,
    transmission: 0.22,
    depthWrite: false,
  });
  const glow = new THREE.MeshBasicMaterial({ color: 0xf4f7ef, toneMapped: false });
  const curtain = new THREE.MeshStandardMaterial({
    color: 0xf6f3e9,
    transparent: true,
    opacity: 0.62,
    roughness: 0.95,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const add = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
    name = "real-room-detail",
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.name = name;
    mesh.castShadow = !(material instanceof THREE.MeshBasicMaterial);
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  const box = (
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    x = 0,
    y = h / 2,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    name = "real-room-panel",
  ) => add(
    new RoundedBoxGeometry(w, h, d, 3, Math.min(0.055, w / 9, h / 9, d / 9)),
    material, x, y, z, rx, ry, rz, name,
  );
  const cylinder = (
    radius: number,
    height: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
    name = "real-room-cylinder",
  ) => add(new THREE.CylinderGeometry(radius, radius, height, 18), material, x, y, z, rx, ry, rz, name);
  const wheel = (x: number, z: number, y = 0.1) =>
    cylinder(0.1, 0.08, black, x, y, z, Math.PI / 2, 0, 0, "caster");
  const monitor = (w: number, h: number, y: number, z = 0) => {
    box(w, h, 0.12, black, 0, y, z, 0, 0, 0, "monitor-frame");
    box(w - 0.12, h - 0.12, 0.025, screen, 0, y, z + 0.073, 0, 0, 0, "monitor-screen");
    cylinder(0.06, 0.7, silver, 0, y - h / 2 - 0.28, z, 0, 0, 0, "monitor-neck");
    box(0.9, 0.06, 0.48, silver, 0, y - h / 2 - 0.62, z + 0.05, 0, 0, 0, "monitor-foot");
  };

  switch (kind) {
    case "rr-balcony-curtains": {
      box(3.2, 4.6, 0.16, white, 0, 2.3, 0, 0, 0, 0, "door-frame");
      box(1.4, 4.28, 0.05, glass, -0.76, 2.25, 0.1, 0, 0, 0, "door-glass");
      box(1.4, 4.28, 0.05, glass, 0.76, 2.25, 0.1, 0, 0, 0, "door-glass");
      box(0.1, 4.35, 0.13, white, 0, 2.25, 0.12);
      cylinder(0.045, 3.9, silver, 0, 4.58, 0.04, 0, 0, Math.PI / 2, "curtain-rod");
      for (const side of [-1, 1]) {
        const panel = add(new THREE.PlaneGeometry(1.35, 4.25, 10, 1), curtain, side * 1.48, 2.35, 0.26, 0, 0, 0, "sheer-curtain");
        const positions = panel.geometry.attributes.position;
        for (let i = 0; i < positions.count; i += 1) {
          const x = positions.getX(i);
          positions.setZ(i, Math.sin((x + 0.7) * 18) * 0.045);
        }
        positions.needsUpdate = true;
        panel.geometry.computeVertexNormals();
      }
      break;
    }
    case "rr-ceiling-light":
      cylinder(0.62, 0.18, white, 0, 0, 0, 0, 0, 0, "ceiling-light-rim");
      cylinder(0.53, 0.055, glow, 0, -0.115, 0, 0, 0, 0, "ceiling-light-diffuser");
      break;
    case "rr-glass-cabinets": {
      box(2.5, 4.25, 0.72, white, 0, 2.125, 0, 0, 0, 0, "cabinet-shell");
      box(2.27, 3.96, 0.59, charcoal, 0, 2.12, 0.04, 0, 0, 0, "cabinet-interior");
      for (const x of [-0.59, 0.59]) {
        for (const y of [0.82, 1.62, 2.42, 3.22]) box(1.06, 0.055, 0.52, white, x, y, 0.02, 0, 0, 0, "glass-shelf");
        box(1.09, 3.9, 0.04, glass, x, 2.13, 0.39, 0, 0, 0, "glass-door");
      }
      for (const x of [-1.18, 0, 1.18]) box(0.06, 3.99, 0.08, white, x, 2.13, 0.4, 0, 0, 0, "door-frame");
      break;
    }
    case "rr-slim-display":
      box(1.25, 4.25, 0.72, white, 0, 2.125, 0);
      box(1.02, 3.96, 0.59, charcoal, 0, 2.12, 0.04);
      for (const y of [0.82, 1.62, 2.42, 3.22]) box(1.0, 0.055, 0.52, white, 0, y, 0.02, 0, 0, 0, "glass-shelf");
      box(1.03, 3.9, 0.04, glass, 0, 2.13, 0.39, 0, 0, 0, "glass-door");
      for (const x of [-0.59, 0.59]) box(0.06, 3.99, 0.08, white, x, 2.13, 0.4, 0, 0, 0, "door-frame");
      break;
    case "rr-dresser":
      box(2.65, 2.35, 0.9, white, 0, 1.175, 0);
      box(2.56, 0.08, 0.84, warmWhite, 0, 2.34, 0);
      for (let i = 0; i < 4; i += 1) {
        box(2.48, 0.5, 0.07, white, 0, 0.34 + i * 0.54, 0.48, 0, 0, 0, "drawer-front");
        box(1.55, 0.025, 0.025, charcoal, 0, 0.51 + i * 0.54, 0.525, 0, 0, 0, "drawer-shadow-pull");
      }
      break;
    case "rr-tv":
      monitor(3.05, 1.72, 1.38, 0);
      box(1.55, 0.1, 0.4, black, 0, 0.12, 0.38, 0, 0, 0, "keyboard");
      for (const x of [-1.18, 1.18]) box(0.24, 0.34, 0.22, charcoal, x, 0.2, 0.22, 0, 0, 0, "speaker");
      break;
    case "rr-framed-photo":
      box(0.72, 0.58, 0.08, wood, 0, 0.36, 0, -0.08, 0, 0, "photo-frame");
      box(0.56, 0.42, 0.02, accent, 0, 0.37, 0.052, -0.08, 0, 0, "photo-image");
      break;
    case "rr-armchair":
      box(1.5, 0.22, 1.25, warmWhite, 0, 0.88, 0);
      box(1.48, 1.72, 0.22, warmWhite, 0, 1.72, -0.52, -0.08);
      for (const x of [-0.72, 0.72]) {
        cylinder(0.06, 1.65, wood, x, 0.82, -0.5, 0, 0, -0.06);
        cylinder(0.06, 1.5, wood, x, 0.75, 0.48, 0, 0, 0.06);
        box(0.12, 0.12, 1.05, wood, x, 1.22, 0, 0.05, 0, 0, "wood-arm");
      }
      break;
    case "rr-standing-desk":
      box(4.25, 0.16, 1.75, wood, 0, 1.9, 0, 0, 0, 0, "bamboo-top");
      for (const x of [-1.62, 1.62]) {
        box(0.2, 1.75, 0.2, white, x, 0.95, 0, 0, 0, 0, "lifting-column");
        box(0.22, 0.72, 0.22, silver, x, 1.23, 0);
        box(0.18, 0.12, 1.48, white, x, 0.08, 0.06, 0, 0, 0, "desk-foot");
      }
      box(3.5, 0.1, 0.22, black, 0, 1.62, -0.7, 0, 0, 0, "cable-tray");
      break;
    case "rr-ergonomic-chair": {
      cylinder(0.1, 1.2, silver, 0, 0.66, 0, 0, 0, 0, "chair-column");
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        box(0.72, 0.07, 0.1, silver, Math.cos(a) * 0.32, 0.2, Math.sin(a) * 0.32, 0, -a, 0, "chair-base-leg");
        wheel(Math.cos(a) * 0.72, Math.sin(a) * 0.72);
      }
      box(1.25, 0.22, 1.05, black, 0, 1.18, 0.06, -0.04, 0, 0, "chair-seat");
      box(1.12, 1.75, 0.15, charcoal, 0, 2.1, -0.43, -0.1, 0, 0, "mesh-back");
      for (const x of [-0.74, 0.74]) {
        box(0.12, 0.8, 0.12, white, x, 1.28, 0.04, 0, 0, 0, "arm-support");
        box(0.42, 0.1, 0.16, black, x, 1.68, -0.03, 0, 0, 0, "arm-pad");
      }
      break;
    }
    case "rr-ultrawide-monitor":
      monitor(3.15, 1.55, 1.5, 0);
      break;
    case "rr-laptop":
      box(1.75, 0.08, 1.18, silver, 0, 0.06, 0.2, 0, 0, 0, "laptop-base");
      box(1.7, 1.08, 0.07, silver, 0, 0.62, -0.32, -0.28, 0, 0, "laptop-lid");
      box(1.56, 0.91, 0.02, screen, 0, 0.64, -0.275, -0.28, 0, 0, "laptop-screen");
      break;
    case "rr-keyboard":
      box(1.55, 0.09, 0.55, black, -0.16, 0.07, 0);
      for (let r = 0; r < 4; r += 1) for (let c = 0; c < 11; c += 1)
        box(0.09, 0.025, 0.075, charcoal, -0.78 + c * 0.125, 0.13, -0.18 + r * 0.12);
      add(new THREE.SphereGeometry(0.22, 16, 10), black, 0.95, 0.13, 0.02, 0, 0, 0, "mouse").scale.set(0.72, 0.45, 1);
      break;
    case "rr-microphone":
      cylinder(0.32, 0.055, black, 0, 0.03, 0, 0, 0, 0, "mic-base");
      cylinder(0.045, 0.75, silver, 0, 0.4, 0);
      cylinder(0.2, 0.72, black, 0, 0.93, 0, Math.PI / 2, 0, 0, "foam-microphone");
      break;
    case "rr-softbox":
      for (const x of [-0.58, 0.58]) cylinder(0.04, 2.5, black, x, 1.25, 0);
      box(1.65, 1.42, 0.12, black, 0, 2.95, 0);
      box(1.45, 1.22, 0.025, glow, 0, 2.95, 0.071, 0, 0, 0, "softbox-diffuser");
      for (let x = -0.55; x <= 0.55; x += 0.28) box(0.018, 1.2, 0.018, black, x, 2.95, 0.095);
      for (let y = 2.52; y <= 3.38; y += 0.28) box(1.43, 0.018, 0.018, black, 0, y, 0.095);
      for (const x of [-0.65, 0.65]) box(0.06, 0.06, 0.8, black, x, 0.06, 0, 0, 0, 0, "softbox-foot");
      break;
    case "rr-camera":
      box(0.72, 0.5, 0.34, black, 0, 0.3, 0, 0, 0, 0, "camera-body");
      box(0.25, 0.18, 0.2, black, -0.2, 0.62, 0);
      cylinder(0.23, 0.46, charcoal, 0.12, 0.34, 0.34, Math.PI / 2, 0, 0, "camera-lens");
      cylinder(0.16, 0.02, glass, 0.12, 0.34, 0.58, Math.PI / 2);
      break;
    case "rr-task-lamp":
      cylinder(0.3, 0.055, white, 0, 0.03, 0);
      box(0.08, 0.9, 0.08, white, 0, 0.48, 0, 0, 0, -0.18, "lamp-arm");
      box(0.08, 1.05, 0.08, white, -0.3, 1.34, 0, 0, 0, 0.55, "lamp-arm");
      box(0.52, 0.08, 0.22, glow, -0.62, 1.72, 0, 0, 0, 0.25, "task-light-head");
      break;
    case "rr-bottles":
      cylinder(0.16, 0.88, glass, 0, 0.44, 0, 0, 0, 0, "water-bottle");
      cylinder(0.14, 0.12, accent, 0, 0.94, 0, 0, 0, 0, "bottle-cap");
      break;
    case "rr-backpack": {
      const bag = box(1.25, 0.62, 0.95, black, 0, 0.34, 0, 0, 0, -0.08, "backpack-body");
      bag.scale.set(1, 1, 0.82);
      for (const x of [-0.34, 0.34]) add(new THREE.TorusGeometry(0.38, 0.045, 8, 18, Math.PI), black, x, 0.28, -0.42, Math.PI / 2, 0, 0, "backpack-strap");
      box(0.7, 0.28, 0.08, charcoal, 0, 0.28, 0.45, 0, 0, 0, "front-pocket");
      break;
    }
    case "rr-air-purifier":
      box(0.9, 1.85, 0.82, white, 0, 0.925, 0, 0, 0, 0, "purifier-shell");
      cylinder(0.29, 0.025, charcoal, 0, 1.86, 0, 0, 0, 0, "fan-grille");
      cylinder(0.1, 0.035, black, 0, 1.15, 0.43, Math.PI / 2, 0, 0, "sensor-port");
      for (let y = 0.18; y < 0.95; y += 0.13) for (let x = -0.31; x <= 0.31; x += 0.13)
        cylinder(0.018, 0.02, warmWhite, x, y, 0.421, Math.PI / 2);
      break;
    case "rr-rolling-drawers":
      box(1.25, 1.8, 1.1, white, 0, 0.98, 0);
      for (let i = 0; i < 5; i += 1) {
        box(1.15, 0.29, 0.06, white, 0, 0.36 + i * 0.32, 0.58, 0, 0, 0, "drawer-front");
        box(0.55, 0.025, 0.025, charcoal, 0, 0.47 + i * 0.32, 0.62);
      }
      for (const x of [-0.46, 0.46]) for (const z of [-0.4, 0.4]) wheel(x, z, 0.08);
      break;
    case "rr-waste-bin":
      add(new THREE.CylinderGeometry(0.36, 0.29, 0.78, 20, 1, true), warmWhite, 0, 0.39, 0, 0, 0, 0, "waste-bin");
      add(new THREE.TorusGeometry(0.36, 0.025, 8, 24), silver, 0, 0.78, 0, Math.PI / 2);
      break;
    case "rr-wall-ac":
      box(2.45, 0.62, 0.5, white, 0, 0, 0, 0, 0, 0, "ac-shell");
      box(2.12, 0.07, 0.1, charcoal, 0, -0.22, 0.28, 0.18, 0, 0, "ac-vent");
      for (let x = -0.85; x <= 0.85; x += 0.28) box(0.02, 0.18, 0.04, silver, x, -0.2, 0.34, 0.18);
      break;
    case "rr-desk-accessories":
      for (const x of [-0.72, 0.72]) box(0.32, 0.48, 0.28, black, x, 0.25, 0, 0, 0, 0, "desk-speaker");
      box(1.1, 0.11, 0.24, white, 0, 0.07, 0.12, 0, 0, 0, "power-strip");
      for (let x = -0.38; x <= 0.38; x += 0.25) cylinder(0.045, 0.02, charcoal, x, 0.14, 0.13);
      box(1.7, 0.1, 0.28, black, 0, 0.1, -0.38, 0, 0, 0, "cable-tray");
      break;
  }

  root.userData.sculptRuntime = {
    nodes: Object.fromEntries(root.children.map((child) => [child.name, child])),
    collider: "bounding-box",
    source: "Ramon's real room photos",
  };
  return true;
}
