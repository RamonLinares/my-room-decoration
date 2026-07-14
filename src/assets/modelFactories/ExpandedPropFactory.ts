import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EXPANDED_KINDS } from "../../data/expandedCatalog";

const ACCENTS = [0xb75e4b, 0x6f8875, 0xd7a34c, 0x66858d, 0xd8a69a];

export function buildExpandedProp(
  root: THREE.Group,
  kind: string,
  color: number,
) {
  if (!EXPANDED_KINDS.has(kind)) return false;

  const primary = new THREE.MeshStandardMaterial({ color, roughness: 0.74 });
  const wood = new THREE.MeshStandardMaterial({
    color: 0x654231,
    roughness: 0.76,
  });
  const cream = new THREE.MeshStandardMaterial({
    color: 0xf1dfc1,
    roughness: 0.88,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0xb69255,
    roughness: 0.38,
    metalness: 0.55,
  });
  const green = new THREE.MeshStandardMaterial({
    color: 0x547452,
    roughness: 0.86,
  });
  const glow = new THREE.MeshBasicMaterial({
    color: 0xffd58a,
    toneMapped: false,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xb9d9d5,
    transparent: true,
    opacity: 0.46,
    roughness: 0.08,
    metalness: 0.05,
    clearcoat: 1,
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
    name = "detail",
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  const box = (
    w: number,
    h: number,
    d: number,
    m: THREE.Material = primary,
    x = 0,
    y = h / 2,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    n = "panel",
  ) =>
    add(
      new RoundedBoxGeometry(w, h, d, 3, Math.min(0.08, w / 8, h / 8, d / 8)),
      m,
      x,
      y,
      z,
      rx,
      ry,
      rz,
      n,
    );
  const leg = (x: number, z: number, h = 1.5, m: THREE.Material = wood) =>
    add(
      new THREE.CylinderGeometry(0.08, 0.12, h, 8),
      m,
      x,
      h / 2,
      z,
      0,
      0,
      0,
      "turned-leg",
    );
  const disc = (
    r: number,
    h: number,
    m: THREE.Material = primary,
    x = 0,
    y = h / 2,
    z = 0,
  ) =>
    add(
      new THREE.CylinderGeometry(r, r * 0.92, h, 20),
      m,
      x,
      y,
      z,
      0,
      0,
      0,
      "turned-form",
    );
  const leaf = (x: number, y: number, z: number, s = 0.35, rot = 0) => {
    const m = add(
      new THREE.SphereGeometry(s, 10, 7),
      green,
      x,
      y,
      z,
      0,
      rot,
      0,
      "leaf",
    );
    m.scale.set(1, 0.35, 1.6);
    return m;
  };
  const pot = (r = 0.42, h = 0.65, x = 0, z = 0) =>
    add(
      new THREE.CylinderGeometry(r, r * 0.72, h, 14),
      primary,
      x,
      h / 2,
      z,
      0,
      0,
      0,
      "pot",
    );
  const rug = (w: number, d: number, oval = false) => {
    const mesh = oval
      ? add(
          new THREE.CircleGeometry(1, 36),
          primary,
          0,
          0.025,
          0,
          -Math.PI / 2,
          0,
          0,
          "rug",
        )
      : add(
          new THREE.PlaneGeometry(w, d),
          primary,
          0,
          0.025,
          0,
          -Math.PI / 2,
          0,
          0,
          "rug",
        );
    if (oval) mesh.scale.set(w / 2, d / 2, 1);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  };

  switch (kind) {
    case "daybed":
      box(3.5, 0.42, 1.65, wood, 0, 0.38, 0);
      box(3.25, 0.38, 1.5, cream, 0, 0.78, 0);
      box(3.4, 1.2, 0.22, primary, 0, 1.18, -0.68);
      disc(0.3, 1.1, primary, -1.3, 0.9, 0);
      break;
    case "spindlebed":
      box(3, 0.45, 4, wood, 0, 0.4, 0);
      box(2.8, 0.4, 3.7, cream, 0, 0.86, 0.05);
      for (let x = -1.25; x <= 1.25; x += 0.5)
        add(
          new THREE.CylinderGeometry(0.045, 0.06, 1.5, 8),
          primary,
          x,
          1.65,
          -1.85,
        );
      box(2.85, 0.12, 0.12, primary, 0, 2.35, -1.85);
      break;
    case "bunkbed":
      for (const y of [0.65, 2.55]) {
        box(3, 0.35, 4, wood, 0, y, 0);
        box(2.82, 0.32, 3.75, cream, 0, y + 0.34, 0);
      }
      for (const x of [-1.35, 1.35])
        for (const z of [-1.85, 1.85])
          add(new THREE.CylinderGeometry(0.09, 0.12, 3.9, 8), wood, x, 1.95, z);
      const ladderBottomX = 1.9;
      const ladderTopX = 1.52;
      const ladderBottomY = 0.25;
      const ladderTopY = 3.55;
      const ladderRise = ladderTopY - ladderBottomY;
      const ladderLean = ladderBottomX - ladderTopX;
      const ladderLength = Math.hypot(ladderRise, ladderLean);
      const ladderRotation = Math.atan2(ladderLean, ladderRise);
      for (const z of [-1.75, -1.05])
        add(
          new THREE.CylinderGeometry(0.055, 0.07, ladderLength, 8),
          metal,
          (ladderBottomX + ladderTopX) / 2,
          (ladderBottomY + ladderTopY) / 2,
          z,
          0,
          0,
          ladderRotation,
          "bunk-ladder-rail",
        );
      for (let y = 0.55; y < 3.45; y += 0.48) {
        const progress = (y - ladderBottomY) / ladderRise;
        const x = THREE.MathUtils.lerp(ladderBottomX, ladderTopX, progress);
        box(0.08, 0.08, 0.82, metal, x, y, -1.4, 0, 0, 0, "bunk-ladder-rung");
      }
      break;
    case "trundlebed":
      box(3.15, 0.48, 4, wood, 0, 0.35, 0);
      box(2.95, 0.38, 3.75, cream, 0, 0.78, 0);
      box(2.7, 0.42, 3.25, primary, 0.42, 0.23, 0.35);
      for (const x of [-0.65, 1.35])
        add(
          new THREE.CylinderGeometry(0.11, 0.11, 0.12, 12),
          wood,
          x,
          0.08,
          1.75,
          Math.PI / 2,
        );
      break;
    case "brassbed":
      box(3, 0.38, 4, wood, 0, 0.38, 0);
      box(2.8, 0.4, 3.7, cream, 0, 0.78, 0);
      for (const z of [-1.82, 1.82]) {
        for (const x of [-1.35, 1.35])
          add(
            new THREE.CylinderGeometry(0.06, 0.08, 1.65, 10),
            metal,
            x,
            1.25,
            z,
          );
        add(
          new THREE.TorusGeometry(1.15, 0.055, 8, 28, Math.PI),
          metal,
          0,
          1.9,
          z,
          0,
          0,
          Math.PI,
        );
      }
      break;
    case "cradle":
      box(1.75, 0.55, 1.05, cream, 0, 0.8, 0);
      for (const z of [-0.48, 0.48])
        add(
          new THREE.TorusGeometry(0.78, 0.08, 8, 24, Math.PI),
          wood,
          0,
          0.48,
          z,
          0,
          0,
          Math.PI,
        );
      for (const x of [-0.75, 0.75]) box(0.09, 0.85, 0.09, wood, x, 0.72, 0);
      add(
        new THREE.SphereGeometry(0.72, 18, 12, 0, Math.PI, 0, Math.PI / 2),
        primary,
        0,
        1.28,
        -0.25,
        0,
        0,
        0,
        "hood",
      );
      break;
    case "floorbed":
      box(3.2, 0.32, 3.4, cream, 0, 0.25, 0);
      box(3, 0.16, 3.2, primary, 0, 0.5, 0);
      for (const x of [-0.85, 0.85])
        box(1.25, 0.22, 0.68, cream, x, 0.66, -1.05);
      break;

    case "rockingchair":
      box(1.35, 0.22, 1.35, primary, 0, 1.12, 0);
      box(1.35, 1.75, 0.2, primary, 0, 2, 0.52, -0.14);
      for (const x of [-0.55, 0.55]) {
        add(
          new THREE.TorusGeometry(0.86, 0.075, 8, 24, Math.PI),
          wood,
          x,
          0.32,
          0,
          0,
          0,
          Math.PI,
        );
        for (const z of [-0.48, 0.48]) leg(x, z, 1.05);
      }
      break;
    case "windowbench":
      box(3.3, 0.45, 1.3, wood, 0, 0.72, 0);
      for (const x of [-1.35, 1.35]) box(0.22, 1.1, 1.15, wood, x, 0.55, 0);
      box(3.05, 0.3, 1.12, primary, 0, 1.16, 0);
      for (const x of [-1.05, 0, 1.05])
        box(0.85, 0.5, 0.25, cream, x, 1.52, -0.45);
      break;
    case "sewingtable":
      box(2.7, 0.18, 1.45, primary, 0, 1.72, 0);
      for (const x of [-1.05, 1.05]) leg(x, -0.48, 1.62);
      for (const x of [-1.05, 1.05]) leg(x, 0.48, 1.62);
      add(
        new THREE.TorusGeometry(0.62, 0.055, 8, 28),
        metal,
        0.82,
        0.82,
        0,
        0,
        Math.PI / 2,
      );
      box(0.8, 0.12, 0.52, wood, -0.1, 0.28, 0);
      break;
    case "teatrolley":
      for (const y of [0.55, 1.55]) box(2.15, 0.16, 1.15, primary, 0, y, 0);
      for (const x of [-0.92, 0.92])
        for (const z of [-0.46, 0.46])
          add(
            new THREE.CylinderGeometry(0.055, 0.075, 1.55, 8),
            metal,
            x,
            0.88,
            z,
          );
      for (const x of [-0.92, 0.92])
        add(
          new THREE.TorusGeometry(0.27, 0.05, 8, 18),
          wood,
          x,
          0.26,
          0.48,
          0,
          Math.PI / 2,
        );
      break;
    case "laddershelf":
      for (const x of [-0.78, 0.78])
        add(
          new THREE.CylinderGeometry(0.07, 0.11, 3.9, 8),
          wood,
          x,
          1.95,
          0,
          0,
          0,
          x * 0.08,
        );
      for (let i = 0; i < 4; i++)
        box(1.75 - i * 0.16, 0.14, 0.82, primary, 0, 0.65 + i * 0.82, 0);
      break;
    case "cornercabinet":
      add(
        new THREE.CylinderGeometry(1.05, 1.05, 3.4, 3),
        wood,
        0,
        1.7,
        0,
        0,
        Math.PI / 2,
      );
      for (const y of [0.35, 1.2, 2.05, 2.9])
        box(1.35, 0.08, 0.75, cream, 0.18, y, 0.18, 0, -Math.PI / 4);
      for (const y of [0.8, 1.65, 2.5])
        add(new THREE.SphereGeometry(0.06, 10, 7), metal, 0.62, y, 0.62);
      break;
    case "vanity":
      box(2.8, 0.2, 1.2, primary, 0, 1.65, 0);
      for (const x of [-1.12, 1.12])
        for (const z of [-0.42, 0.42]) leg(x, z, 1.55);
      box(1.65, 1.65, 0.12, wood, 0, 2.58, -0.43);
      add(new THREE.CircleGeometry(0.7, 28), glass, 0, 2.58, -0.35);
      for (const x of [-0.72, 0.72]) box(0.6, 0.42, 0.8, cream, x, 1.35, 0.05);
      break;
    case "spindlestool":
      disc(0.55, 0.18, primary, 0, 1.08, 0);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        leg(Math.cos(a) * 0.38, Math.sin(a) * 0.38, 1.02);
      }
      break;
    case "chaise":
      box(3.1, 0.48, 1.45, primary, 0, 0.72, 0);
      for (const x of [-1.3, 1.3]) for (const z of [-0.5, 0.5]) leg(x, z, 0.5);
      box(0.34, 1.25, 1.42, primary, -1.36, 1.12, 0, 0, 0, -0.22);
      disc(0.25, 1.2, cream, 1.05, 1.05, 0);
      break;
    case "coatstand":
      add(new THREE.CylinderGeometry(0.1, 0.14, 3.5, 10), wood, 0, 1.8, 0);
      disc(0.62, 0.12, wood, 0, 0.06, 0);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        box(
          0.65,
          0.07,
          0.07,
          metal,
          Math.cos(a) * 0.28,
          3.15 + Math.sin(a * 2) * 0.18,
          Math.sin(a) * 0.28,
          0,
          -a,
          0.35,
        );
      }
      break;
    case "nestingtables":
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.48,
          y = 1.35 - i * 0.25;
        box(
          1.05,
          0.12,
          0.85,
          ACCENTS[i] === color
            ? primary
            : new THREE.MeshStandardMaterial({
                color: ACCENTS[i],
                roughness: 0.75,
              }),
          x,
          y,
          i * 0.18,
        );
        for (const dx of [-0.42, 0.42])
          for (const dz of [-0.32, 0.32]) leg(x + dx, i * 0.18 + dz, y - 0.08);
      }
      break;
    case "blanketladder":
      for (const x of [-0.62, 0.62])
        add(
          new THREE.CylinderGeometry(0.065, 0.09, 3.35, 8),
          wood,
          x,
          1.68,
          0,
          0,
          0,
          x * 0.05,
        );
      for (let y = 0.55; y < 3.1; y += 0.55)
        box(1.35, 0.07, 0.07, wood, 0, y, 0);
      box(1.05, 1.4, 0.05, primary, 0, 1.45, 0.08, 0, 0, 0.06);
      break;
    case "dropleaftable":
      box(2.9, 0.16, 1.65, primary, 0, 1.72, 0);
      for (const x of [-1.15, 1.15])
        for (const z of [-0.55, 0.55]) leg(x, z, 1.62);
      for (const x of [-1.62, 1.62])
        add(
          new THREE.CircleGeometry(0.82, 24),
          primary,
          x,
          1.72,
          0,
          -Math.PI / 2,
          0,
          0,
          "drop-leaf",
        );
      break;

    case "typewriter":
      box(1.55, 0.42, 1.05, wood, 0, 0.3, 0);
      box(1.38, 0.12, 0.56, primary, 0, 0.56, 0.15, -0.22);
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 8; c++)
          add(
            new THREE.CylinderGeometry(0.045, 0.045, 0.035, 10),
            cream,
            -0.48 + c * 0.14,
            0.66,
            -0.02 + r * 0.13,
          );
      box(1.25, 0.04, 0.04, metal, 0, 0.82, -0.35);
      break;
    case "arteasel":
      for (const x of [-0.65, 0.65])
        add(
          new THREE.CylinderGeometry(0.055, 0.09, 3.1, 8),
          wood,
          x,
          1.55,
          0,
          0,
          0,
          x * 0.08,
        );
      add(
        new THREE.CylinderGeometry(0.06, 0.1, 2.75, 8),
        wood,
        0,
        1.29,
        -0.62,
        0.44,
      );
      box(1.75, 1.8, 0.08, cream, 0, 1.85, 0.05);
      box(1.5, 0.08, 0.32, primary, 0, 0.86, 0.25);
      break;
    case "corkboard":
      box(2.5, 1.7, 0.12, wood, 0, 0.85, 0);
      box(
        2.25,
        1.45,
        0.04,
        new THREE.MeshStandardMaterial({ color: 0xb58b63, roughness: 1 }),
        0,
        0.85,
        0.08,
      );
      for (let i = 0; i < 6; i++) {
        box(
          0.38,
          0.3,
          0.015,
          new THREE.MeshBasicMaterial({ color: ACCENTS[i % 5] }),
          -0.72 + (i % 3) * 0.72,
          0.55 + Math.floor(i / 3) * 0.55,
          0.11,
          0,
          0,
          (i - 2) * 0.05,
        );
      }
      break;
    case "rotaryphone":
      box(1.25, 0.38, 0.82, wood, 0, 0.23, 0);
      add(
        new THREE.TorusGeometry(0.28, 0.07, 8, 24),
        cream,
        0,
        0.5,
        0.22,
        Math.PI / 2,
      );
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5;
        add(
          new THREE.CylinderGeometry(0.035, 0.035, 0.03, 8),
          wood,
          Math.sin(a) * 0.2,
          0.5 + Math.cos(a) * 0.2,
          0.3,
          Math.PI / 2,
        );
      }
      box(1.18, 0.18, 0.22, primary, 0, 0.67, -0.15, 0, 0, 0.05);
      break;
    case "papertray":
      for (let i = 0; i < 3; i++) {
        box(1.25, 0.09, 0.85, wood, 0, 0.16 + i * 0.24, 0);
        box(0.08, 0.22, 0.85, wood, -0.58, 0.26 + i * 0.24, 0);
        box(0.08, 0.22, 0.85, wood, 0.58, 0.26 + i * 0.24, 0);
      }
      for (let i = 0; i < 3; i++)
        box(0.95, 0.02, 0.62, cream, 0, 0.23 + i * 0.24, 0.04);
      break;
    case "pencilcup":
      add(new THREE.CylinderGeometry(0.3, 0.25, 0.65, 14), primary, 0, 0.33, 0);
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9;
        add(
          new THREE.CylinderGeometry(0.025, 0.025, 0.82, 6),
          new THREE.MeshStandardMaterial({ color: ACCENTS[i % 5] }),
          Math.cos(a) * 0.13,
          0.83 + Math.sin(a) * 0.04,
          Math.sin(a) * 0.13,
          0,
          0,
          (i - 3) * 0.04,
        );
      }
      break;
    case "mapcabinet":
      box(2.55, 1.25, 1.15, wood, 0, 0.63, 0);
      for (let i = 0; i < 5; i++) {
        box(2.28, 0.18, 0.98, primary, 0, 0.18 + i * 0.22, 0.08);
        box(0.45, 0.045, 0.06, metal, 0, 0.18 + i * 0.22, 0.6);
      }
      break;

    case "bankerslamp":
      disc(0.42, 0.12, metal, 0, 0.06, 0);
      add(
        new THREE.CylinderGeometry(0.045, 0.065, 0.65, 10),
        metal,
        0,
        0.43,
        0,
      );
      box(
        1.05,
        0.34,
        0.48,
        new THREE.MeshPhysicalMaterial({
          color: 0x5c8a68,
          roughness: 0.2,
          clearcoat: 1,
        }),
        0,
        0.82,
        0,
      );
      add(
        new THREE.BoxGeometry(0.7, 0.03, 0.3),
        glow,
        0,
        0.66,
        0,
      ).userData.glow = true;
      break;
    case "mushroomlamp":
      disc(0.36, 0.7, cream, 0, 0.35, 0);
      add(
        new THREE.SphereGeometry(0.62, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.22,
          clearcoat: 1,
        }),
        0,
        0.72,
        0,
      ).userData.glow = true;
      break;
    case "scallopsconce":
      box(0.55, 0.85, 0.18, metal, 0, 0.45, 0);
      for (let i = -1; i <= 1; i++)
        add(
          new THREE.SphereGeometry(0.24, 16, 10),
          primary,
          i * 0.22,
          0.95,
          0.08,
        ).userData.glow = true;
      add(
        new THREE.SphereGeometry(0.14, 12, 8),
        glow,
        0,
        0.82,
        0.22,
      ).userData.glow = true;
      break;
    case "beadedchandelier":
      add(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 8), metal, 0, -0.65, 0);
      for (const r of [0.45, 0.8])
        add(
          new THREE.TorusGeometry(r, 0.055, 8, 28),
          metal,
          0,
          -1.2,
          0,
          Math.PI / 2,
        );
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6,
          r = i % 2 ? 0.8 : 0.45;
        add(
          new THREE.SphereGeometry(0.08, 10, 7),
          cream,
          Math.cos(a) * r,
          -1.35 - Math.sin(a * 2) * 0.18,
          Math.sin(a) * r,
        );
        add(
          new THREE.SphereGeometry(0.11, 12, 8),
          glow,
          Math.cos(a) * r * 0.7,
          -1.55,
          Math.sin(a) * r * 0.7,
        ).userData.glow = true;
      }
      break;
    case "oillamp":
      disc(0.35, 0.18, metal, 0, 0.09, 0);
      add(new THREE.SphereGeometry(0.38, 18, 13), glass, 0, 0.48, 0);
      add(
        new THREE.CylinderGeometry(0.14, 0.2, 0.5, 16),
        glow,
        0,
        0.62,
        0,
      ).userData.glow = true;
      add(
        new THREE.CylinderGeometry(0.28, 0.36, 0.5, 18, 1, true),
        primary,
        0,
        0.85,
        0,
      );
      break;
    case "readinglamp":
      disc(0.48, 0.12, wood, 0, 0.06, 0);
      add(
        new THREE.CylinderGeometry(0.05, 0.08, 2.4, 10),
        metal,
        0,
        1.25,
        0,
        0,
        0,
        -0.08,
      );
      add(
        new THREE.TorusGeometry(0.48, 0.045, 8, 18, Math.PI * 0.8),
        metal,
        0.25,
        2.35,
        0,
        0,
        0,
        -0.5,
      );
      add(
        new THREE.ConeGeometry(0.5, 0.65, 18, 1, true),
        primary,
        0.62,
        2.52,
        0,
        0,
        0,
        -0.35,
      );
      add(
        new THREE.SphereGeometry(0.13, 12, 8),
        glow,
        0.5,
        2.35,
        0,
      ).userData.glow = true;
      break;
    case "nightlight":
      box(0.72, 0.65, 0.45, primary, 0, 0.33, 0);
      add(
        new THREE.ConeGeometry(0.52, 0.55, 4),
        wood,
        0,
        0.87,
        0,
        0,
        Math.PI / 4,
      );
      for (const x of [-0.18, 0.18])
        box(0.16, 0.22, 0.02, glow, x, 0.4, 0.24).userData.glow = true;
      break;
    case "paperstring":
      add(
        new THREE.CylinderGeometry(0.025, 0.025, 3.8, 8),
        wood,
        0,
        0.15,
        0,
        0,
        0,
        Math.PI / 2,
      );
      for (let i = 0; i < 9; i++)
        add(
          new THREE.SphereGeometry(0.16, 12, 8),
          new THREE.MeshBasicMaterial({ color: ACCENTS[i % 5] }),
          -1.7 + i * 0.42,
          0.05 + Math.sin(i * 0.8) * 0.14,
          0,
        ).userData.glow = true;
      break;
    case "fireflyjar":
      disc(0.32, 0.06, metal, 0, 0.03, 0);
      add(new THREE.CylinderGeometry(0.3, 0.3, 0.72, 18), glass, 0, 0.42, 0);
      box(0.62, 0.08, 0.62, metal, 0, 0.82, 0);
      for (let i = 0; i < 7; i++)
        add(
          new THREE.SphereGeometry(0.035, 8, 6),
          glow,
          Math.sin(i * 2.1) * 0.2,
          0.24 + (i % 4) * 0.14,
          Math.cos(i * 1.7) * 0.2,
        ).userData.glow = true;
      break;

    case "ovalrug":
      rug(4.3, 3, true);
      for (const s of [0.58, 0.82]) {
        const ring = add(
          new THREE.TorusGeometry(s, 0.025, 6, 38),
          cream,
          0,
          0.045,
          0,
          Math.PI / 2,
        );
        ring.scale.set(2.1, 1.42, 1);
      }
      break;
    case "hallrunner":
      rug(2, 5.5);
      for (let z = -2.2; z <= 2.2; z += 0.55)
        box(1.65, 0.012, 0.04, cream, 0, 0.045, z);
      break;
    case "tapestry":
      box(3.2, 2.4, 0.08, primary, 0, 1.2, 0);
      for (let i = 0; i < 5; i++) {
        const tree = add(
          new THREE.ConeGeometry(0.28, 0.7, 6),
          green,
          -1.15 + i * 0.58,
          0.75 + (i % 2) * 0.22,
          0.08,
        );
        tree.scale.y = 1.2;
      }
      box(3.45, 0.08, 0.12, wood, 0, 2.46, 0);
      for (let x = -1.45; x <= 1.45; x += 0.22)
        add(new THREE.ConeGeometry(0.05, 0.28, 5), primary, x, -0.14, 0);
      break;
    case "quilthanging":
      box(3, 2.65, 0.08, cream, 0, 1.32, 0);
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 5; c++)
          box(
            0.48,
            0.5,
            0.02,
            new THREE.MeshStandardMaterial({
              color: ACCENTS[(r + c) % 5],
              roughness: 0.95,
            }),
            -1.05 + c * 0.52,
            0.48 + r * 0.54,
            0.06,
            0,
            0,
            (r - c) * 0.015,
          );
      box(3.3, 0.08, 0.12, wood, 0, 2.72, 0);
      break;
    case "pegrail":
      box(3.2, 0.42, 0.18, cream, 0, 0.35, 0);
      for (let x = -1.35; x <= 1.35; x += 0.45) {
        add(
          new THREE.CylinderGeometry(0.05, 0.07, 0.32, 8),
          wood,
          x,
          0.35,
          0.2,
          Math.PI / 2,
        );
        add(new THREE.SphereGeometry(0.09, 10, 7), wood, x, 0.35, 0.38);
      }
      break;
    case "curtains":
      for (const x of [-1.05, 1.05]) {
        const panel = box(
          1.55,
          2.7,
          0.08,
          primary,
          x,
          1.35,
          0,
          0,
          0,
          x < 0 ? -0.08 : 0.08,
        );
        panel.scale.x = 0.92;
        for (let y = 0.3; y < 2.55; y += 0.32)
          box(1.28, 0.025, 0.03, cream, x, y, 0.06);
      }
      box(4, 0.09, 0.12, wood, 0, 2.76, 0);
      for (const x of [-2, 2])
        add(new THREE.SphereGeometry(0.12, 10, 7), metal, x, 2.76, 0);
      break;
    case "foldingscreen":
      for (let i = -1; i <= 1; i++) {
        const x = i * 1.05,
          z = Math.abs(i) * 0.18;
        box(1, 3, 0.1, wood, x, 1.5, z, 0, i * 0.18);
        box(
          0.82,
          2.72,
          0.04,
          new THREE.MeshStandardMaterial({
            color: ACCENTS[(i + 2) % 5],
            roughness: 0.92,
          }),
          x,
          1.5,
          z + 0.07,
          0,
          i * 0.18,
        );
      }
      break;
    case "wallplates":
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9,
          r = i ? 0.48 + (i % 2) * 0.42 : 0;
        add(
          new THREE.CylinderGeometry(
            0.28 + (i % 3) * 0.05,
            0.28 + (i % 3) * 0.05,
            0.05,
            24,
          ),
          i % 2 ? cream : primary,
          Math.cos(a) * r,
          0.85 + Math.sin(a) * r,
          0,
          Math.PI / 2,
        );
        add(
          new THREE.SphereGeometry(0.07, 10, 7),
          new THREE.MeshStandardMaterial({ color: ACCENTS[i % 5] }),
          Math.cos(a) * r,
          0.85 + Math.sin(a) * r,
          0.05,
        );
      }
      break;
    case "papermobile":
      add(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8), wood, 0, -0.55, 0);
      add(
        new THREE.TorusGeometry(0.65, 0.035, 8, 24),
        metal,
        0,
        -1,
        0,
        Math.PI / 2,
      );
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        add(
          new THREE.CylinderGeometry(0.015, 0.015, 0.6 + (i % 2) * 0.3, 6),
          metal,
          Math.cos(a) * 0.55,
          -1.3,
          Math.sin(a) * 0.55,
        );
        i % 2
          ? add(
              new THREE.SphereGeometry(0.15, 10, 7),
              cream,
              Math.cos(a) * 0.55,
              -1.7 - (i % 2) * 0.15,
              Math.sin(a) * 0.55,
            )
          : add(
              new THREE.ConeGeometry(0.2, 0.4, 5),
              primary,
              Math.cos(a) * 0.55,
              -1.65,
              Math.sin(a) * 0.55,
            );
      }
      break;
    case "hatboxes":
      for (let i = 0; i < 3; i++) {
        const r = 0.68 - i * 0.11,
          x = (i - 1) * 0.12;
        disc(
          r,
          0.38,
          new THREE.MeshStandardMaterial({
            color: ACCENTS[(i + 1) % 5],
            roughness: 0.86,
          }),
          x,
          0.19 + i * 0.42,
          0,
        );
        add(
          new THREE.TorusGeometry(r, 0.035, 6, 24),
          cream,
          x,
          0.38 + i * 0.42,
          0,
          Math.PI / 2,
        );
      }
      break;
    case "fireplace":
      box(3.45, 3.15, 0.82, cream, 0, 1.58, 0);
      box(2.35, 2.25, 0.2, wood, 0, 1.15, 0.43);
      add(
        new THREE.TorusGeometry(0.78, 0.25, 8, 22, Math.PI),
        cream,
        0,
        2.05,
        0.55,
        0,
        0,
        Math.PI,
      );
      box(3.7, 0.28, 1.02, wood, 0, 2.85, 0);
      for (let x = -1.4; x <= 1.4; x += 0.4)
        box(
          0.32,
          0.22,
          0.03,
          new THREE.MeshStandardMaterial({
            color: ACCENTS[Math.abs(Math.round(x * 10)) % 5],
            roughness: 0.9,
          }),
          x,
          0.35,
          0.54,
        );
      for (let i = 0; i < 4; i++)
        add(
          new THREE.ConeGeometry(0.18, 0.65, 7),
          i % 2 ? glow : primary,
          (i - 1.5) * 0.28,
          0.52,
          0.58,
        ).userData.glow = true;
      break;
    case "ceramicvases":
      disc(0.26, 0.75, primary, -0.45, 0.38, 0);
      add(new THREE.SphereGeometry(0.34, 16, 12), cream, 0.05, 0.35, 0);
      add(new THREE.CylinderGeometry(0.12, 0.3, 0.7, 16), cream, 0.05, 0.72, 0);
      add(
        new THREE.SphereGeometry(0.24, 14, 10),
        new THREE.MeshStandardMaterial({ color: ACCENTS[2], roughness: 0.8 }),
        0.48,
        0.25,
        0,
      );
      add(
        new THREE.CylinderGeometry(0.1, 0.16, 0.48, 14),
        new THREE.MeshStandardMaterial({ color: ACCENTS[2] }),
        0.48,
        0.58,
        0,
      );
      break;

    case "tinrobot":
      box(0.62, 0.72, 0.42, primary, 0, 0.68, 0);
      box(0.48, 0.42, 0.4, cream, 0, 1.28, 0);
      for (const x of [-0.17, 0.17])
        add(new THREE.SphereGeometry(0.045, 8, 6), wood, x, 1.34, 0.22);
      box(0.2, 0.04, 0.03, wood, 0, 1.18, 0.22);
      for (const x of [-0.42, 0.42])
        add(
          new THREE.CylinderGeometry(0.055, 0.055, 0.65, 8),
          metal,
          x,
          0.7,
          0,
          0,
          0,
          x > 0 ? -0.25 : 0.25,
        );
      for (const x of [-0.18, 0.18]) box(0.15, 0.55, 0.18, wood, x, 0.27, 0);
      break;
    case "ragdoll":
      add(new THREE.SphereGeometry(0.25, 14, 10), cream, 0, 1.05, 0);
      box(0.48, 0.62, 0.22, primary, 0, 0.65, 0);
      for (const x of [-0.38, 0.38])
        add(
          new THREE.CapsuleGeometry(0.07, 0.48, 4, 7),
          cream,
          x,
          0.68,
          0,
          0,
          0,
          x > 0 ? -0.45 : 0.45,
        );
      for (const x of [-0.16, 0.16])
        add(new THREE.CapsuleGeometry(0.08, 0.5, 4, 7), cream, x, 0.2, 0);
      for (const x of [-0.09, 0.09])
        add(new THREE.SphereGeometry(0.035, 8, 6), wood, x, 1.1, 0.22);
      break;
    case "rockinghorse":
      for (const z of [-0.3, 0.3])
        add(
          new THREE.TorusGeometry(0.78, 0.07, 8, 24, Math.PI),
          wood,
          0,
          0.28,
          z,
          0,
          0,
          Math.PI,
        );
      const body = add(
        new THREE.CapsuleGeometry(0.34, 0.9, 5, 10),
        primary,
        0,
        0.9,
        0,
        0,
        0,
        Math.PI / 2,
      );
      body.scale.x = 1.2;
      add(
        new THREE.CapsuleGeometry(0.18, 0.6, 5, 9),
        primary,
        0.62,
        1.2,
        0,
        0,
        0,
        -0.35,
      );
      add(new THREE.SphereGeometry(0.28, 14, 10), primary, 0.72, 1.55, 0);
      for (const x of [-0.42, 0.42])
        for (const z of [-0.24, 0.24])
          add(
            new THREE.CylinderGeometry(0.055, 0.075, 0.62, 8),
            wood,
            x,
            0.55,
            z,
          );
      break;
    case "chessset":
      box(1.35, 0.12, 1.35, wood, 0, 0.06, 0);
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
          box(
            0.15,
            0.015,
            0.15,
            (r + c) % 2 ? cream : primary,
            -0.53 + c * 0.15,
            0.13,
            -0.53 + r * 0.15,
          );
      for (let i = 0; i < 12; i++) {
        const x = -0.5 + (i % 6) * 0.2,
          z = i < 6 ? -0.48 : 0.48;
        add(
          new THREE.CylinderGeometry(0.055, 0.08, 0.22 + (i % 3) * 0.08, 8),
          i < 6 ? wood : cream,
          x,
          0.25,
          z,
        );
      }
      break;
    case "postcards":
      for (let i = 0; i < 4; i++) {
        box(
          0.82,
          0.025,
          0.58,
          new THREE.MeshStandardMaterial({ color: 0xf0dfba, roughness: 1 }),
          i * 0.08,
          0.02 + i * 0.025,
          i * 0.05,
          0,
          (i - 1) * 0.05,
        );
        box(
          0.18,
          0.012,
          0.14,
          new THREE.MeshBasicMaterial({ color: ACCENTS[i % 5] }),
          -0.22 + i * 0.08,
          0.045 + i * 0.025,
          0.16 + i * 0.05,
          -Math.PI / 2,
        );
      }
      break;
    case "binoculars":
      for (const x of [-0.18, 0.18])
        add(
          new THREE.CylinderGeometry(0.14, 0.21, 0.62, 14),
          metal,
          x,
          0.2,
          0,
          Math.PI / 2,
        );
      box(0.36, 0.14, 0.28, wood, 0, 0.2, 0);
      for (const x of [-0.18, 0.18])
        add(new THREE.CircleGeometry(0.13, 16), glass, x, 0.2, 0.33);
      break;
    case "windupbird":
      add(new THREE.SphereGeometry(0.3, 16, 11), primary, 0, 0.42, 0);
      add(new THREE.SphereGeometry(0.2, 14, 10), cream, 0.28, 0.64, 0);
      add(
        new THREE.ConeGeometry(0.1, 0.28, 6),
        metal,
        0.5,
        0.63,
        0,
        0,
        0,
        -Math.PI / 2,
      );
      for (const x of [-0.14, 0.14])
        add(
          new THREE.CylinderGeometry(0.025, 0.035, 0.32, 6),
          metal,
          x,
          0.16,
          0,
        );
      add(new THREE.BoxGeometry(0.28, 0.035, 0.035), metal, -0.28, 0.42, 0);
      break;
    case "modelplane":
      box(1.65, 0.16, 0.22, wood, 0, 0.28, 0);
      add(
        new THREE.ConeGeometry(0.16, 0.45, 8),
        primary,
        0.98,
        0.28,
        0,
        0,
        0,
        -Math.PI / 2,
      );
      box(0.7, 0.06, 1.5, primary, 0, 0.3, 0, 0, 0, 0.02);
      box(0.42, 0.05, 0.62, cream, -0.58, 0.4, 0);
      break;
    case "marbles":
      add(
        new THREE.SphereGeometry(0.42, 14, 10),
        primary,
        0,
        0.18,
        0,
      ).scale.set(1, 0.55, 0.8);
      for (let i = 0; i < 8; i++) {
        const a = i * 2.2;
        add(
          new THREE.SphereGeometry(0.09, 12, 8),
          new THREE.MeshPhysicalMaterial({
            color: ACCENTS[i % 5],
            roughness: 0.12,
            clearcoat: 1,
          }),
          Math.cos(a) * 0.3,
          0.28 + (i % 3) * 0.05,
          Math.sin(a) * 0.22,
        );
      }
      break;
    case "teaset":
      disc(0.38, 0.14, primary, 0, 0.12, 0);
      add(new THREE.SphereGeometry(0.28, 14, 10), cream, 0, 0.4, 0);
      add(new THREE.CylinderGeometry(0.12, 0.18, 0.25, 12), cream, 0, 0.67, 0);
      add(
        new THREE.TorusGeometry(0.18, 0.035, 7, 18, Math.PI),
        cream,
        0.3,
        0.43,
        0,
        0,
        0,
        Math.PI / 2,
      );
      for (const x of [-0.52, 0.52]) {
        disc(0.2, 0.08, primary, x, 0.04, 0.18);
        add(
          new THREE.CylinderGeometry(0.16, 0.12, 0.22, 12),
          cream,
          x,
          0.18,
          0.18,
        );
      }
      break;
    case "hifistack": {
      const face = new THREE.MeshStandardMaterial({
        color: 0x3e3a36,
        roughness: 0.42,
        metalness: 0.28,
      });
      const silver = new THREE.MeshStandardMaterial({
        color: 0xb9b5aa,
        roughness: 0.3,
        metalness: 0.72,
      });
      const display = new THREE.MeshBasicMaterial({
        color: 0xd39a58,
        toneMapped: false,
      });
      box(2.25, 2.2, 1.08, wood, 0, 1.18, 0, 0, 0, 0, "hi-fi-cabinet");
      for (const x of [-0.88, 0.88])
        for (const z of [-0.38, 0.38]) leg(x, z, 0.24, face);
      for (const y of [0.62, 1.12, 1.62])
        box(1.92, 0.4, 0.78, face, 0, y, 0.18, 0, 0, 0, "audio-component");
      box(
        0.72,
        0.14,
        0.025,
        display,
        -0.45,
        1.62,
        0.592,
        0,
        0,
        0,
        "radio-display",
      );
      for (const x of [0.3, 0.64, 0.88])
        add(
          new THREE.CylinderGeometry(0.1, 0.1, 0.07, 16),
          silver,
          x,
          1.62,
          0.62,
          Math.PI / 2,
          0,
          0,
          "receiver-dial",
        );
      box(0.92, 0.23, 0.025, face, 0, 1.12, 0.592, 0, 0, 0, "cassette-window");
      for (let i = 0; i < 6; i++)
        box(
          0.12,
          0.06,
          0.04,
          silver,
          -0.55 + i * 0.22,
          0.62,
          0.6,
          0,
          0,
          0,
          "deck-button",
        );
      box(2.05, 0.12, 0.98, primary, 0, 2.31, 0, 0, 0, 0, "turntable-plinth");
      add(
        new THREE.CylinderGeometry(0.62, 0.62, 0.055, 28),
        face,
        -0.24,
        2.4,
        0,
        0,
        0,
        0,
        "record-platter",
      );
      add(
        new THREE.CylinderGeometry(0.08, 0.08, 0.065, 16),
        silver,
        -0.24,
        2.44,
        0,
      );
      const tonearm = box(
        0.055,
        0.055,
        0.72,
        silver,
        0.64,
        2.46,
        0.06,
        0,
        -0.32,
        0,
        "tonearm",
      );
      tonearm.castShadow = true;
      break;
    }
    case "floorspeakers": {
      const grille = new THREE.MeshStandardMaterial({
        color: 0x302d2a,
        roughness: 0.94,
      });
      const cone = new THREE.MeshStandardMaterial({
        color: 0x171615,
        roughness: 0.58,
      });
      const x = 0;
      box(0.88, 2.5, 0.82, primary, x, 1.3, 0, 0, 0, 0, "speaker-cabinet");
      box(0.72, 2.3, 0.035, grille, x, 1.31, 0.43, 0, 0, 0, "speaker-grille");
      for (const [y, radius] of [
        [2.12, 0.13],
        [1.52, 0.29],
        [0.72, 0.32],
      ] as [number, number][]) {
        add(
          new THREE.CylinderGeometry(radius, radius * 0.78, 0.055, 20),
          cone,
          x,
          y,
          0.47,
          Math.PI / 2,
          0,
          0,
          "speaker-driver",
        );
        add(
          new THREE.TorusGeometry(radius * 0.92, 0.025, 7, 20),
          grille,
          x,
          y,
          0.505,
          0,
          0,
          0,
          "driver-surround",
        );
      }
      for (const footX of [-0.27, 0.27])
        add(
          new THREE.CylinderGeometry(0.055, 0.075, 0.12, 8),
          metal,
          x + footX,
          0.06,
          0,
        );
      break;
    }

    case "rubberplant":
      pot(0.52, 0.72);
      for (let i = 0; i < 10; i++) {
        const a = i * 2.1,
          r = 0.28 + (i % 3) * 0.12;
        add(
          new THREE.CylinderGeometry(0.025, 0.035, 1.2 + (i % 4) * 0.22, 6),
          green,
          Math.cos(a) * r * 0.25,
          1.25,
          Math.sin(a) * r * 0.25,
          Math.sin(a) * 0.28,
          0,
          Math.cos(a) * 0.22,
        );
        leaf(Math.cos(a) * r, 1.35 + (i % 4) * 0.28, Math.sin(a) * r, 0.32, a);
      }
      break;
    case "trailingivy":
      pot(0.38, 0.5);
      for (let vine = 0; vine < 5; vine++)
        for (let i = 0; i < 6; i++) {
          const a = vine * 1.25;
          leaf(
            Math.cos(a) * (0.3 + i * 0.07),
            0.35 - i * 0.22,
            Math.sin(a) * (0.3 + i * 0.07),
            0.13,
            a + i * 0.2,
          );
        }
      break;
    case "olivetree": {
      pot(0.58, 0.75);
      const bark = new THREE.MeshStandardMaterial({
        color: 0x6f5941,
        roughness: 0.96,
      });
      const oliveLeafMaterials = [
        new THREE.MeshStandardMaterial({ color: 0x6f805c, roughness: 0.9 }),
        new THREE.MeshStandardMaterial({ color: 0x879071, roughness: 0.92 }),
      ];
      const branch = (
        start: THREE.Vector3,
        end: THREE.Vector3,
        bend: THREE.Vector3,
        radius: number,
        name: string,
      ) => {
        const midpoint = start.clone().lerp(end, 0.5).add(bend);
        return add(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([start, midpoint, end]),
            5,
            radius,
            6,
            false,
          ),
          bark,
          0,
          0,
          0,
          0,
          0,
          0,
          name,
        );
      };
      const oliveLeaf = (
        position: THREE.Vector3,
        angle: number,
        index: number,
      ) => {
        const mesh = add(
          new THREE.IcosahedronGeometry(0.18, 0),
          oliveLeafMaterials[index % oliveLeafMaterials.length],
          position.x,
          position.y,
          position.z,
          0.2 + (index % 3) * 0.12,
          angle,
          (index % 2 ? -1 : 1) * 0.25,
          "olive-leaf",
        );
        mesh.scale.set(0.58, 0.22, 1.55);
      };

      branch(
        new THREE.Vector3(0, 0.68, 0),
        new THREE.Vector3(0.04, 2.55, -0.02),
        new THREE.Vector3(-0.11, 0.05, 0.07),
        0.12,
        "gnarled-trunk",
      );

      const goldenAngle = 2.399;
      for (let b = 0; b < 6; b++) {
        const angle = 0.35 + b * goldenAngle;
        const length = 0.72 + (b % 3) * 0.11;
        const start = new THREE.Vector3(
          (b % 2 ? -1 : 1) * 0.025,
          2.08 + b * 0.075,
          ((b % 3) - 1) * 0.018,
        );
        const end = new THREE.Vector3(
          Math.cos(angle) * length,
          2.92 + (b % 3) * 0.2,
          Math.sin(angle) * length,
        );
        const side = new THREE.Vector3(-Math.sin(angle), 0.12, Math.cos(angle));
        branch(
          start,
          end,
          side.clone().multiplyScalar(0.12),
          0.055 - b * 0.003,
          "crown-branch",
        );

        const forkStart = start.clone().lerp(end, 0.62);
        for (const direction of [-1, 1]) {
          const forkAngle = angle + direction * 0.52;
          const forkEnd = end
            .clone()
            .add(
              new THREE.Vector3(
                Math.cos(forkAngle) * 0.34,
                0.18 + direction * 0.03,
                Math.sin(forkAngle) * 0.34,
              ),
            );
          branch(
            forkStart,
            forkEnd,
            new THREE.Vector3(0, 0.08, 0),
            0.025,
            "olive-twig",
          );
          oliveLeaf(forkEnd, forkAngle, b * 4 + (direction > 0 ? 1 : 0));
          oliveLeaf(
            forkStart
              .clone()
              .lerp(forkEnd, 0.66)
              .add(side.clone().multiplyScalar(0.1 * direction)),
            forkAngle + direction * 0.35,
            b * 4 + (direction > 0 ? 3 : 2),
          );
        }
        oliveLeaf(
          start.clone().lerp(end, 0.72).add(side.clone().multiplyScalar(0.12)),
          angle,
          b * 4,
        );
      }
      break;
    }
    case "herbpots":
      for (let p = -1; p <= 1; p++) {
        pot(0.25, 0.42, p * 0.52, 0);
        for (let i = 0; i < 7; i++) {
          const a = i * 2.2;
          leaf(
            p * 0.52 + Math.cos(a) * 0.18,
            0.55 + (i % 3) * 0.12,
            Math.sin(a) * 0.18,
            0.09,
            a,
          );
        }
      }
      break;
    case "terrarium":
      disc(0.4, 0.1, wood, 0, 0.05, 0);
      add(
        new THREE.SphereGeometry(
          0.46,
          20,
          15,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.7,
        ),
        glass,
        0,
        0.48,
        0,
      );
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4;
        add(
          new THREE.ConeGeometry(0.08, 0.32, 6),
          green,
          Math.cos(a) * 0.22,
          0.28,
          Math.sin(a) * 0.22,
          0,
          0,
          Math.sin(a) * 0.3,
        );
      }
      add(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), metal, 0, 0.94, 0);
      break;
    case "bonsai":
      box(1.05, 0.22, 0.72, primary, 0, 0.12, 0);
      add(
        new THREE.CylinderGeometry(0.07, 0.14, 0.75, 8),
        wood,
        -0.1,
        0.58,
        0,
        0,
        0,
        -0.24,
      );
      for (let i = 0; i < 7; i++) {
        const a = i * 1.9;
        leaf(
          -0.15 + Math.cos(a) * 0.42,
          0.78 + (i % 3) * 0.13,
          Math.sin(a) * 0.3,
          0.2,
          a,
        );
      }
      break;
    case "driedbouquet":
      add(
        new THREE.CylinderGeometry(0.24, 0.31, 0.62, 14),
        primary,
        0,
        0.31,
        0,
      );
      for (let i = 0; i < 14; i++) {
        const a = i * 2.2;
        add(
          new THREE.CylinderGeometry(0.012, 0.02, 0.9 + (i % 4) * 0.16, 5),
          new THREE.MeshStandardMaterial({ color: 0x8b7650, roughness: 1 }),
          Math.cos(a) * 0.13,
          0.9,
          Math.sin(a) * 0.13,
          Math.sin(a) * 0.18,
          0,
          Math.cos(a) * 0.18,
        );
        add(
          new THREE.SphereGeometry(0.055 + (i % 2) * 0.025, 7, 5),
          new THREE.MeshStandardMaterial({
            color: ACCENTS[(i + 2) % 5],
            roughness: 1,
          }),
          Math.cos(a) * 0.28,
          1.32 + (i % 4) * 0.15,
          Math.sin(a) * 0.28,
        );
      }
      break;
  }

  return root.children.length > 0;
}
