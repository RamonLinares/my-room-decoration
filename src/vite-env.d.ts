/// <reference types="vite/client" />
interface ThreeGameDiagnostics {
  frame: number;
  fps: number;
  frameTimeMs: number;
  state: string;
  player: { position: { x: number; y: number; z: number } };
  camera: {
    firstPerson: boolean;
    yaw: number;
    pitch: number;
    fov: number;
    distance: number;
    wallOpacity: Record<"back" | "front" | "left" | "right", number>;
  };
  room: {
    width: number;
    depth: number;
    shape: "rectangle" | "l" | "t" | "u";
    shapeWidth: number;
    crossbarDepth: number;
  };
  entities: { pickups: number; total: number };
  editor: {
    selectedId: string | null;
    historyLength: number;
    futureLength: number;
    placement: {
      kind: string;
      valid: boolean;
      x: number;
      z: number;
    } | null;
    objects: Array<{
      id: string;
      kind: string;
      scale: number;
      screen: { x: number; y: number };
    }>;
  };
  renderer: {
    calls: number;
    triangles: number;
    geometries: number;
    textures: number;
  };
}
interface Window {
  __THREE_GAME_DIAGNOSTICS__?: ThreeGameDiagnostics;
}
