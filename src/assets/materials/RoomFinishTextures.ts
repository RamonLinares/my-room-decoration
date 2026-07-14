import * as THREE from "three";

export const WALL_FINISH_STYLES = [
  "paint",
  "linen",
  "pinstripe",
  "gingham",
  "botanical",
  "scallop",
  "tiny-floral",
  "soft-brick",
] as const;

export const FLOOR_FINISH_STYLES = [
  "planks",
  "herringbone",
  "parquet",
  "checker",
  "tile",
  "terrazzo",
  "cork",
  "concrete",
] as const;

export type WallFinishStyle = (typeof WALL_FINISH_STYLES)[number];
export type FloorFinishStyle = (typeof FLOOR_FINISH_STYLES)[number];

const css = (color: THREE.Color) => `#${color.getHexString()}`;
const shifted = (value: number, lightness: number, saturation = 0) =>
  new THREE.Color(value).offsetHSL(0, saturation, lightness);

function canvasTexture(
  color: number,
  draw: (context: CanvasRenderingContext2D, palette: THREE.Color[]) => void,
  repeat: [number, number],
) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d")!;
  const palette = [
    new THREE.Color(color),
    shifted(color, -0.12),
    shifted(color, 0.12),
    shifted(color, -0.04, 0.05),
  ];
  context.fillStyle = css(palette[0]);
  context.fillRect(0, 0, 256, 256);
  draw(context, palette);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.anisotropy = 4;
  return texture;
}

export function createWallFinishTexture(style: WallFinishStyle, color: number) {
  if (style === "paint") return undefined;
  return canvasTexture(
    color,
    (context, palette) => {
      context.lineCap = "round";
      if (style === "linen") {
        context.globalAlpha = 0.2;
        context.strokeStyle = css(palette[1]);
        for (let x = 2; x < 256; x += 7) {
          context.beginPath();
          context.moveTo(x, 0);
          context.lineTo(x + 2, 256);
          context.stroke();
        }
        context.strokeStyle = css(palette[2]);
        for (let y = 3; y < 256; y += 9) {
          context.beginPath();
          context.moveTo(0, y);
          context.lineTo(256, y + 1);
          context.stroke();
        }
      } else if (style === "pinstripe") {
        context.globalAlpha = 0.3;
        context.fillStyle = css(palette[2]);
        for (let x = 0; x < 256; x += 32) context.fillRect(x, 0, 10, 256);
        context.globalAlpha = 0.22;
        context.fillStyle = css(palette[1]);
        for (let x = 13; x < 256; x += 32) context.fillRect(x, 0, 2, 256);
      } else if (style === "gingham") {
        context.globalAlpha = 0.22;
        context.fillStyle = css(palette[1]);
        for (let x = 0; x < 256; x += 64) context.fillRect(x, 0, 28, 256);
        for (let y = 0; y < 256; y += 64) context.fillRect(0, y, 256, 28);
      } else if (style === "botanical") {
        context.strokeStyle = css(palette[1]);
        context.fillStyle = css(palette[3]);
        context.globalAlpha = 0.42;
        context.lineWidth = 3;
        for (let x = 20; x < 256; x += 58) {
          context.beginPath();
          context.moveTo(x, 256);
          context.bezierCurveTo(x - 16, 190, x + 26, 110, x + 5, 0);
          context.stroke();
          for (let y = 32; y < 242; y += 48) {
            context.beginPath();
            context.ellipse(x + (y % 96 ? 10 : -9), y, 8, 15, y % 96 ? -0.6 : 0.6, 0, Math.PI * 2);
            context.fill();
          }
        }
      } else if (style === "scallop") {
        context.strokeStyle = css(palette[1]);
        context.globalAlpha = 0.32;
        context.lineWidth = 3;
        for (let y = 0; y < 280; y += 32)
          for (let x = y % 64 ? -16 : 0; x < 272; x += 32) {
            context.beginPath();
            context.arc(x + 16, y, 16, 0, Math.PI);
            context.stroke();
          }
      } else if (style === "tiny-floral") {
        context.globalAlpha = 0.46;
        for (let y = 22; y < 256; y += 52)
          for (let x = (y / 52) % 2 ? 18 : 44; x < 256; x += 52) {
            context.fillStyle = css(palette[1]);
            for (let petal = 0; petal < 5; petal += 1) {
              const angle = (petal / 5) * Math.PI * 2;
              context.beginPath();
              context.arc(x + Math.cos(angle) * 7, y + Math.sin(angle) * 7, 4, 0, Math.PI * 2);
              context.fill();
            }
            context.fillStyle = css(palette[2]);
            context.beginPath();
            context.arc(x, y, 3, 0, Math.PI * 2);
            context.fill();
          }
      } else if (style === "soft-brick") {
        context.strokeStyle = css(palette[1]);
        context.globalAlpha = 0.24;
        context.lineWidth = 3;
        for (let y = 0; y <= 256; y += 42) {
          context.beginPath();
          context.moveTo(0, y);
          context.lineTo(256, y);
          context.stroke();
          const offset = (y / 42) % 2 ? 42 : 0;
          for (let x = offset; x < 256; x += 84) {
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x, y + 42);
            context.stroke();
          }
        }
      }
      context.globalAlpha = 1;
    },
    style === "linen" ? [3, 3] : [4, 3],
  );
}

export function createFloorFinishTexture(style: FloorFinishStyle, color: number) {
  return canvasTexture(
    color,
    (context, palette) => {
      context.lineWidth = 3;
      context.strokeStyle = css(palette[1]);
      context.globalAlpha = 0.42;
      if (style === "planks") {
        for (let x = 0; x <= 256; x += 48) {
          context.beginPath();
          context.moveTo(x, 0);
          context.lineTo(x, 256);
          context.stroke();
        }
        context.globalAlpha = 0.2;
        for (let x = 12; x < 256; x += 48)
          for (let i = 0; i < 7; i += 1) {
            context.beginPath();
            context.moveTo(x, i * 41);
            context.bezierCurveTo(x + 18, i * 41 + 8, x - 9, i * 41 + 25, x + 22, i * 41 + 34);
            context.stroke();
          }
      } else if (style === "herringbone") {
        context.lineWidth = 12;
        for (let y = -32; y < 288; y += 64)
          for (let x = -32; x < 288; x += 64) {
            context.beginPath();
            context.moveTo(x, y + 32);
            context.lineTo(x + 32, y);
            context.stroke();
            context.beginPath();
            context.moveTo(x + 32, y);
            context.lineTo(x + 64, y + 32);
            context.stroke();
          }
      } else if (style === "parquet") {
        for (let y = 0; y < 256; y += 64)
          for (let x = 0; x < 256; x += 64) {
            context.strokeRect(x, y, 64, 64);
            for (let n = 16; n < 64; n += 16) {
              context.beginPath();
              if ((x + y) % 128 === 0) {
                context.moveTo(x + n, y);
                context.lineTo(x + n, y + 64);
              } else {
                context.moveTo(x, y + n);
                context.lineTo(x + 64, y + n);
              }
              context.stroke();
            }
          }
      } else if (style === "checker") {
        context.globalAlpha = 0.5;
        context.fillStyle = css(palette[1]);
        for (let y = 0; y < 256; y += 64)
          for (let x = 0; x < 256; x += 64)
            if ((x + y) % 128 === 0) context.fillRect(x, y, 64, 64);
      } else if (style === "tile") {
        context.globalAlpha = 0.38;
        for (let n = 0; n <= 256; n += 64) {
          context.beginPath();
          context.moveTo(n, 0);
          context.lineTo(n, 256);
          context.moveTo(0, n);
          context.lineTo(256, n);
          context.stroke();
        }
      } else if (style === "terrazzo") {
        const colors = [palette[1], palette[2], palette[3]];
        for (let i = 0; i < 105; i += 1) {
          context.globalAlpha = 0.34 + (i % 3) * 0.1;
          context.fillStyle = css(colors[i % colors.length]);
          const x = (i * 73) % 256,
            y = (i * 131) % 256,
            size = 2 + (i % 5);
          context.save();
          context.translate(x, y);
          context.rotate((i * 0.7) % Math.PI);
          context.fillRect(-size, -size / 2, size * 2.2, size);
          context.restore();
        }
      } else if (style === "cork") {
        context.globalAlpha = 0.25;
        context.fillStyle = css(palette[1]);
        for (let i = 0; i < 240; i += 1) {
          context.beginPath();
          context.arc((i * 47) % 256, (i * 89) % 256, 1 + (i % 4), 0, Math.PI * 2);
          context.fill();
        }
      } else if (style === "concrete") {
        for (let i = 0; i < 500; i += 1) {
          context.globalAlpha = 0.06 + (i % 4) * 0.015;
          context.fillStyle = i % 2 ? css(palette[1]) : css(palette[2]);
          const size = 1 + (i % 3);
          context.fillRect((i * 29) % 256, (i * 61) % 256, size, size);
        }
      }
      context.globalAlpha = 1;
    },
    style === "terrazzo" || style === "concrete" || style === "cork"
      ? [3, 3]
      : [4, 4],
  );
}
