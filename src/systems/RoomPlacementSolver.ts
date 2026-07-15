import * as THREE from "three";

export type PlacementRect = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type PlacementWallSide = "back" | "front" | "left" | "right";

export type PlacementWallSegment = {
  side: PlacementWallSide;
  cx: number;
  cz: number;
  length: number;
  inwardX: number;
  inwardZ: number;
  rotationY: number;
};

type Interval = [number, number];

function subtractIntervals(base: Interval, cuts: Interval[]): Interval[] {
  let remaining = [base];
  for (const cut of cuts) {
    const next: Interval[] = [];
    for (const [start, end] of remaining) {
      const cutStart = Math.max(start, cut[0]);
      const cutEnd = Math.min(end, cut[1]);
      if (cutEnd <= cutStart + 1e-4) {
        next.push([start, end]);
        continue;
      }
      if (cutStart > start + 1e-4) next.push([start, cutStart]);
      if (end > cutEnd + 1e-4) next.push([cutEnd, end]);
    }
    remaining = next;
  }
  return remaining.filter(([start, end]) => end - start > 0.05);
}

/** Returns only the outside boundary of a union of edge-adjacent rectangles. */
export function roomBoundaryWalls(rects: PlacementRect[]): PlacementWallSegment[] {
  const walls: PlacementWallSegment[] = [];
  const epsilon = 1e-3;
  for (const rect of rects) {
    const others = rects.filter((other) => other !== rect);
    for (const [start, end] of subtractIntervals(
      [rect.minX, rect.maxX],
      others
        .filter((other) => Math.abs(other.maxZ - rect.minZ) < epsilon)
        .map((other) => [other.minX, other.maxX]),
    ))
      walls.push({
        side: "back",
        cx: (start + end) / 2,
        cz: rect.minZ,
        length: end - start,
        inwardX: 0,
        inwardZ: 1,
        rotationY: 0,
      });
    for (const [start, end] of subtractIntervals(
      [rect.minX, rect.maxX],
      others
        .filter((other) => Math.abs(other.minZ - rect.maxZ) < epsilon)
        .map((other) => [other.minX, other.maxX]),
    ))
      walls.push({
        side: "front",
        cx: (start + end) / 2,
        cz: rect.maxZ,
        length: end - start,
        inwardX: 0,
        inwardZ: -1,
        rotationY: Math.PI,
      });
    for (const [start, end] of subtractIntervals(
      [rect.minZ, rect.maxZ],
      others
        .filter((other) => Math.abs(other.maxX - rect.minX) < epsilon)
        .map((other) => [other.minZ, other.maxZ]),
    ))
      walls.push({
        side: "left",
        cx: rect.minX,
        cz: (start + end) / 2,
        length: end - start,
        inwardX: 1,
        inwardZ: 0,
        rotationY: Math.PI / 2,
      });
    for (const [start, end] of subtractIntervals(
      [rect.minZ, rect.maxZ],
      others
        .filter((other) => Math.abs(other.minX - rect.maxX) < epsilon)
        .map((other) => [other.minZ, other.maxZ]),
    ))
      walls.push({
        side: "right",
        cx: rect.maxX,
        cz: (start + end) / 2,
        length: end - start,
        inwardX: -1,
        inwardZ: 0,
        rotationY: -Math.PI / 2,
      });
  }
  return walls;
}

export function nearestWallSegment(
  walls: PlacementWallSegment[],
  x: number,
  z: number,
): PlacementWallSegment | undefined {
  return walls
    .map((wall) => {
      const horizontal = wall.inwardZ !== 0;
      const half = wall.length / 2;
      const along = THREE.MathUtils.clamp(
        horizontal ? x - wall.cx : z - wall.cz,
        -half,
        half,
      );
      const px = horizontal ? wall.cx + along : wall.cx;
      const pz = horizontal ? wall.cz : wall.cz + along;
      return { wall, distance: (px - x) ** 2 + (pz - z) ** 2 };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.wall;
}

export type WallRayHit = {
  wall: PlacementWallSegment;
  point: THREE.Vector3;
  distance: number;
};

/** Finds the front-facing boundary wall directly under a screen-space ray. */
export function raycastBoundaryWall(
  ray: THREE.Ray,
  walls: PlacementWallSegment[],
  roomHeight: number,
  reach = 0.8,
): WallRayHit | undefined {
  const hits: WallRayHit[] = [];
  for (const wall of walls) {
    const normal = new THREE.Vector3(wall.inwardX, 0, wall.inwardZ);
    if (normal.dot(ray.direction) >= -0.05) continue;
    const plane = new THREE.Plane(
      normal,
      -(wall.inwardX * wall.cx + wall.inwardZ * wall.cz),
    );
    const point = ray.intersectPlane(plane, new THREE.Vector3());
    if (!point || point.y < -0.5 || point.y > roomHeight + 0.5) continue;
    const along = wall.inwardZ !== 0 ? point.x - wall.cx : point.z - wall.cz;
    if (Math.abs(along) > wall.length / 2 + reach) continue;
    hits.push({ wall, point, distance: ray.origin.distanceToSquared(point) });
  }
  return hits.sort((a, b) => a.distance - b.distance)[0];
}

export function wallSideLabel(side: PlacementWallSide): string {
  return `${side[0].toUpperCase()}${side.slice(1)} wall`;
}
