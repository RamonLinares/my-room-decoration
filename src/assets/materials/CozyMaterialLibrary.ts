import * as THREE from "three";

let fabricTexture: THREE.Texture | undefined;
let woodTexture: THREE.Texture | undefined;

function sharedFabricTexture() {
  if (fabricTexture) return fabricTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#e8dfd1";
  context.fillRect(0, 0, 512, 512);
  context.globalAlpha = 0.18;
  context.strokeStyle = "#8f8172";
  context.lineWidth = 8;
  for (let line = 0; line < 512; line += 64) {
    context.beginPath();
    context.moveTo(line, 0);
    context.lineTo(line, 512);
    context.stroke();
    context.beginPath();
    context.moveTo(0, line + 32);
    context.lineTo(512, line + 32);
    context.stroke();
  }
  fabricTexture = new THREE.CanvasTexture(canvas);
  fabricTexture.colorSpace = THREE.SRGBColorSpace;
  fabricTexture.wrapS = THREE.RepeatWrapping;
  fabricTexture.wrapT = THREE.RepeatWrapping;
  fabricTexture.repeat.set(2.4, 2.4);
  fabricTexture.anisotropy = 4;
  const loadAuthoredTexture = () =>
    globalThis.setTimeout(() => {
      new THREE.TextureLoader().load(
        `${import.meta.env.BASE_URL}assets/textures/cozy-woven-fabric.webp`,
        (loaded) => {
          if (!fabricTexture) return;
          fabricTexture.image = loaded.image;
          fabricTexture.needsUpdate = true;
          loaded.dispose();
        },
      );
    }, 600);
  if (document.readyState === "complete") loadAuthoredTexture();
  else window.addEventListener("load", loadAuthoredTexture, { once: true });
  return fabricTexture;
}

function sharedWoodTexture() {
  if (woodTexture) return woodTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d")!;
  const gradient = context.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, "#9a8068");
  gradient.addColorStop(0.36, "#c0a58b");
  gradient.addColorStop(0.64, "#a88d74");
  gradient.addColorStop(1, "#c4aa91");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  context.globalAlpha = 0.24;
  context.strokeStyle = "#4f392c";
  context.lineWidth = 1.25;
  for (let y = 8; y < 256; y += 12) {
    context.beginPath();
    context.moveTo(0, y);
    for (let x = 0; x <= 256; x += 24) {
      const wave = Math.sin(x * 0.047 + y * 0.19) * 3.5;
      context.lineTo(x, y + wave);
    }
    context.stroke();
  }
  context.globalAlpha = 0.12;
  for (let i = 0; i < 10; i += 1) {
    context.beginPath();
    context.ellipse(
      18 + ((i * 71) % 220),
      18 + ((i * 43) % 220),
      16 + (i % 3) * 4,
      4 + (i % 2) * 2,
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
  woodTexture = new THREE.CanvasTexture(canvas);
  woodTexture.colorSpace = THREE.SRGBColorSpace;
  woodTexture.wrapS = THREE.RepeatWrapping;
  woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(1.8, 1.8);
  woodTexture.anisotropy = 4;
  return woodTexture;
}

export function createCozyFabricMaterial(color: THREE.ColorRepresentation) {
  return new THREE.MeshStandardMaterial({
    color,
    map: sharedFabricTexture(),
    roughness: 0.92,
    metalness: 0,
  });
}

export function createCozyWoodMaterial(
  color: THREE.ColorRepresentation,
  roughness = 0.68,
) {
  return new THREE.MeshStandardMaterial({
    color,
    map: sharedWoodTexture(),
    roughness,
    metalness: 0,
  });
}

export function createCozyMatteMaterial(
  color: THREE.ColorRepresentation,
  roughness = 0.82,
) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}
