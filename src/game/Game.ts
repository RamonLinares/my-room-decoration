import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Loop } from "../core/Loop";
import { createRenderer, resizeRenderer } from "../core/Renderer";
import {
  EXPANDED_CATALOG,
  EXPANDED_FLOOR_ONLY_KINDS,
  EXPANDED_SUPPORT_HEIGHTS,
} from "../data/expandedCatalog";
import { buildExpandedProp } from "../assets/modelFactories/ExpandedPropFactory";
import { buildRealRoomProp } from "../assets/modelFactories/RealRoomPropFactory";
import {
  createFloorFinishTexture,
  createWallFinishTexture,
  FLOOR_FINISH_STYLES,
  FloorFinishStyle,
  WALL_FINISH_STYLES,
  WallFinishStyle,
} from "../assets/materials/RoomFinishTextures";
import {
  REAL_ROOM_CATALOG,
  REAL_ROOM_FLOOR_ONLY_KINDS,
  REAL_ROOM_SUPPORT_HEIGHTS,
} from "../data/realRoomCatalog";
import {
  ARCHITECTURAL_KINDS,
  ARCHITECTURAL_SIZES,
  ArchitecturalKind,
  buildArchitecturalDoor,
  buildArchitecturalExtension,
} from "../assets/modelFactories/ArchitecturalExtensionFactory";
import { SurfaceController } from "../ui/SurfaceController";

type Category =
  | "beds"
  | "furniture"
  | "workspace"
  | "light"
  | "decor"
  | "keepsake"
  | "plant"
  | "realroom";
type CatalogFilter = Category | "all" | "recent" | "favorites";
type CatalogPlacementFilter = "all" | "floor" | "surface" | "wall" | "ceiling";
type CatalogSizeFilter = "all" | "small" | "medium" | "large";
type CatalogSort = "catalog" | "recent" | "name";
type ItemData = {
  id: string;
  kind: string;
  name: string;
  category: Category;
  x: number;
  y?: number;
  z: number;
  rot: number;
  color: number;
  scale?: number;
  supportId?: string;
};
type CatalogItem = {
  kind: string;
  name: string;
  category: Category;
  icon: string;
  note: string;
  placement?: "floor" | "surface" | "wall" | "ceiling";
  defaultY?: number;
  supportHeight?: number;
};
type RoomShape = "rectangle" | "l" | "t" | "u";
type RoomRect = { minX: number; maxX: number; minZ: number; maxZ: number };
type RoomWallSide = "back" | "front" | "left" | "right";
type PlacementPreview = {
  catalog: CatalogItem;
  data: ItemData;
  group: THREE.Group;
  marker: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  valid: boolean;
};
type ImportedDesign = {
  name: string;
  width: number;
  depth: number;
  shape: RoomShape;
  shapeWidth: number;
  crossbarDepth: number;
  wallColor: number;
  floorColor: number;
  wallStyle: WallFinishStyle;
  floorStyle: FloorFinishStyle;
  evening: boolean;
  muted: boolean;
  items: ItemData[];
};

const CATALOG: CatalogItem[] = [
  {
    kind: "bed",
    name: "Patchwork bed",
    category: "beds",
    icon: "🛏️",
    note: "Soft & sleepy",
  },
  {
    kind: "canopy",
    name: "Storybook canopy",
    category: "beds",
    icon: "🏰",
    note: "Curtains at bedtime",
  },
  {
    kind: "desk",
    name: "Writing desk",
    category: "furniture",
    icon: "🪵",
    note: "For little letters",
  },
  {
    kind: "chair",
    name: "Sunday chair",
    category: "furniture",
    icon: "🪑",
    note: "A quiet corner",
  },
  {
    kind: "shelf",
    name: "Memory shelf",
    category: "furniture",
    icon: "📚",
    note: "Treasures live here",
  },
  {
    kind: "sofa",
    name: "Little loveseat",
    category: "furniture",
    icon: "🛋️",
    note: "Room for two",
  },
  {
    kind: "wardrobe",
    name: "Sunday wardrobe",
    category: "furniture",
    icon: "🚪",
    note: "Secret pockets",
  },
  {
    kind: "nightstand",
    name: "Bedside table",
    category: "furniture",
    icon: "🗄️",
    note: "One tiny drawer",
  },
  {
    kind: "ottoman",
    name: "Floor pouffe",
    category: "furniture",
    icon: "🧶",
    note: "Soft woven seat",
  },
  {
    kind: "toybox",
    name: "Old toy chest",
    category: "furniture",
    icon: "🧰",
    note: "Full of possibilities",
  },
  {
    kind: "dresser",
    name: "Mirror dresser",
    category: "furniture",
    icon: "🪞",
    note: "Morning light",
  },
  {
    kind: "birchtable",
    name: "Light birch table",
    category: "furniture",
    icon: "▱",
    note: "Soft edges, splayed legs",
  },
  {
    kind: "sectional",
    name: "Corner sofa",
    category: "furniture",
    icon: "🛋️",
    note: "Stretch-out seating",
  },
  {
    kind: "armchair",
    name: "Deep armchair",
    category: "furniture",
    icon: "💺",
    note: "A proper reading chair",
  },
  {
    kind: "coffeetable",
    name: "Coffee table",
    category: "furniture",
    icon: "▰",
    note: "Low and useful",
  },
  {
    kind: "tallbookcase",
    name: "Tall bookcase",
    category: "furniture",
    icon: "📚",
    note: "A whole wall of books",
  },
  {
    kind: "billy",
    name: "Slim library case",
    category: "furniture",
    icon: "▥",
    note: "A narrow old favorite",
  },
  {
    kind: "paxdrawers",
    name: "Linen drawer wardrobe",
    category: "furniture",
    icon: "▤",
    note: "Drawers tucked neatly inside",
  },
  {
    kind: "lowbookcase",
    name: "Low bookcase",
    category: "furniture",
    icon: "📖",
    note: "Books within reach",
  },
  {
    kind: "cubestorage",
    name: "Cube storage",
    category: "furniture",
    icon: "▦",
    note: "Nine tidy cubbies",
  },
  {
    kind: "deskchair",
    name: "Rolling desk chair",
    category: "workspace",
    icon: "🪑",
    note: "Ready for homework",
  },
  {
    kind: "desktop",
    name: "Desktop computer",
    category: "workspace",
    icon: "🖥️",
    note: "The whole setup",
  },
  {
    kind: "monitor",
    name: "Computer monitor",
    category: "workspace",
    icon: "🖥️",
    note: "A bright little screen",
  },
  {
    kind: "laptop",
    name: "Open laptop",
    category: "workspace",
    icon: "💻",
    note: "Work anywhere",
  },
  {
    kind: "keyboard",
    name: "Keyboard & mouse",
    category: "workspace",
    icon: "⌨️",
    note: "Clickety-clack",
  },
  {
    kind: "speakers",
    name: "Stereo speakers",
    category: "workspace",
    icon: "🔊",
    note: "A pair for the desk",
  },
  {
    kind: "printer",
    name: "Home printer",
    category: "workspace",
    icon: "🖨️",
    note: "Paper included",
  },
  {
    kind: "filing",
    name: "Filing cabinet",
    category: "workspace",
    icon: "🗄️",
    note: "Three neat drawers",
  },
  {
    kind: "deskset",
    name: "Studio desk",
    category: "workspace",
    icon: "🖥️",
    note: "Wide modern workspace",
  },
  {
    kind: "lamp",
    name: "Honey lamp",
    category: "light",
    icon: "💡",
    note: "Warm evening glow",
  },
  {
    kind: "fairy",
    name: "Fairy lights",
    category: "light",
    icon: "✨",
    note: "Tiny constellations",
  },
  {
    kind: "lantern",
    name: "Paper lantern",
    category: "light",
    icon: "🏮",
    note: "A peachy glow",
  },
  {
    kind: "candles",
    name: "Candle trio",
    category: "light",
    icon: "🕯️",
    note: "Three warm wishes",
  },
  {
    kind: "lavalamp",
    name: "Dreamy lava lamp",
    category: "light",
    icon: "🫧",
    note: "Slow color clouds",
  },
  {
    kind: "teddy",
    name: "Old teddy",
    category: "keepsake",
    icon: "🧸",
    note: "A faithful friend",
  },
  {
    kind: "radio",
    name: "Pocket radio",
    category: "keepsake",
    icon: "📻",
    note: "Songs after school",
  },
  {
    kind: "train",
    name: "Wooden train",
    category: "keepsake",
    icon: "🚂",
    note: "Still runs on dreams",
  },
  {
    kind: "books",
    name: "Story books",
    category: "keepsake",
    icon: "📚",
    note: "Dog-eared favorites",
  },
  {
    kind: "camera",
    name: "Holiday camera",
    category: "keepsake",
    icon: "📷",
    note: "Keep this moment",
  },
  {
    kind: "record",
    name: "Record player",
    category: "keepsake",
    icon: "💿",
    note: "Songs on vinyl",
  },
  {
    kind: "musicbox",
    name: "Music box",
    category: "keepsake",
    icon: "🎵",
    note: "Turn the little key",
  },
  {
    kind: "snowglobe",
    name: "Snow globe",
    category: "keepsake",
    icon: "🔮",
    note: "A world inside",
  },
  {
    kind: "globe",
    name: "Schoolroom globe",
    category: "keepsake",
    icon: "🌍",
    note: "Anywhere from here",
  },
  {
    kind: "dollhouse",
    name: "Tiny dollhouse",
    category: "keepsake",
    icon: "🏠",
    note: "A room within a room",
  },
  {
    kind: "plant",
    name: "Window fern",
    category: "plant",
    icon: "🌿",
    note: "Something growing",
  },
  {
    kind: "flowers",
    name: "Jam-jar flowers",
    category: "plant",
    icon: "🌼",
    note: "From the garden",
  },
  {
    kind: "cactus",
    name: "Button cactus",
    category: "plant",
    icon: "🌵",
    note: "Small but brave",
  },
  {
    kind: "monstera",
    name: "Big-leaf plant",
    category: "plant",
    icon: "🍃",
    note: "A leafy friend",
  },
  {
    kind: "mushroom",
    name: "Mushroom pot",
    category: "plant",
    icon: "🍄",
    note: "Forest-floor magic",
  },
  {
    kind: "roundrug",
    name: "Round braided rug",
    category: "decor",
    icon: "🟠",
    note: "A cozy little island",
  },
  {
    kind: "mirror",
    name: "Standing mirror",
    category: "decor",
    icon: "🪞",
    note: "Catch the window light",
  },
  {
    kind: "clock",
    name: "Mantel clock",
    category: "decor",
    icon: "🕰️",
    note: "Slow afternoons",
  },
  {
    kind: "basket",
    name: "Woven basket",
    category: "decor",
    icon: "🧺",
    note: "For odds and ends",
  },
  {
    kind: "cushion",
    name: "Patchwork cushion",
    category: "decor",
    icon: "🟥",
    note: "One more soft thing",
  },
  {
    kind: "memoryrug",
    name: "Memory rug",
    category: "decor",
    icon: "🧶",
    note: "The room’s old pattern",
  },
  {
    kind: "window",
    name: "Sunny window",
    category: "decor",
    icon: "🪟",
    note: "A view of afternoon",
  },
  {
    kind: "wallframes",
    name: "Picture-frame trio",
    category: "decor",
    icon: "🖼️",
    note: "Three little memories",
  },
  {
    kind: "wallshelf",
    name: "Wall book shelf",
    category: "furniture",
    icon: "📚",
    note: "Books above the floor",
  },
  ...EXPANDED_CATALOG,
  ...REAL_ROOM_CATALOG,
];
const PALETTE = [0xb75e4b, 0x6f8875, 0xd7a34c, 0x66858d, 0xd8a69a, 0x8b6048];
const WALL_FLUSH_KINDS = new Set([
  "window",
  "wallframes",
  "wallshelf",
  ...CATALOG.filter((item) => item.placement === "wall").map(
    (item) => item.kind,
  ),
]);
const SUPPORT_HEIGHTS: Record<string, number> = {
  bed: 1.29,
  canopy: 1.1,
  sofa: 1.2,
  sectional: 1.14,
  chair: 1.2,
  armchair: 1.25,
  desk: 1.9,
  deskset: 1.82,
  birchtable: 1.95,
  coffeetable: 0.88,
  nightstand: 1.48,
  dresser: 1.86,
  filing: 1.72,
  toybox: 1.34,
  shelf: 2.24,
  tallbookcase: 4.25,
  lowbookcase: 1.75,
  cubestorage: 2.55,
  billy: 4.5,
  paxdrawers: 4.5,
  wallshelf: 0.09,
  ...EXPANDED_SUPPORT_HEIGHTS,
  ...REAL_ROOM_SUPPORT_HEIGHTS,
};
const SUPPORT_KINDS = new Set(Object.keys(SUPPORT_HEIGHTS));
const FLOOR_ONLY_KINDS = new Set([
  "bed",
  "canopy",
  "desk",
  "deskset",
  "birchtable",
  "chair",
  "deskchair",
  "armchair",
  "shelf",
  "sofa",
  "sectional",
  "wardrobe",
  "nightstand",
  "ottoman",
  "toybox",
  "dresser",
  "filing",
  "coffeetable",
  "tallbookcase",
  "lowbookcase",
  "cubestorage",
  "billy",
  "paxdrawers",
  "roundrug",
  "mirror",
  "memoryrug",
  "window",
  "wallframes",
  "wallshelf",
  ...EXPANDED_FLOOR_ONLY_KINDS,
  ...REAL_ROOM_FLOOR_ONLY_KINDS,
]);

export class Game {
  private readonly surfaces: SurfaceController;
  private readonly compactToolsQuery = matchMedia("(max-width: 899px)");
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  private controls: OrbitControls;
  private loop = new Loop(
    (d, e) => this.update(d, e),
    () => this.renderer.render(this.scene, this.camera),
  );
  private ray = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private items = new Map<string, THREE.Group>();
  private data: ItemData[] = [];
  private selected?: THREE.Group;
  private placement?: PlacementPreview;
  private drag = false;
  private dragValid = true;
  private dragOffset = new THREE.Vector3();
  private dragHeight = 0;
  private history: ItemData[][] = [];
  private future: ItemData[][] = [];
  private touches = new Map<number, PointerEvent>();
  private pinchStart = 0;
  private pinchCameraDistance = 0;
  private pendingTouch?: {
    pointerId: number;
    startX: number;
    startY: number;
    group: THREE.Group;
  };
  private floorTex?: THREE.Texture;
  private evening = false;
  private keyLight?: THREE.SpotLight;
  private lampLight?: THREE.PointLight;
  private dust?: THREE.Points;
  private roomGroup?: THREE.Group;
  private roomWalls: Array<{
    side: RoomWallSide;
    outwardNormal: THREE.Vector3;
    materials: THREE.Material[];
    opacity: number;
  }> = [];
  private readonly wallViewDirection = new THREE.Vector3();
  private architecturalExtensions = new Map<string, THREE.Group>();
  private doorFollowers: string[] = [];
  private roomWidth = 14;
  private roomDepth = 11;
  private roomShape: RoomShape = "rectangle";
  private roomShapeWidth = 0.55;
  private roomCrossbarDepth = 0.55;
  private roomWallColor = 0xe8d7b8;
  private roomFloorColor = 0x8d6548;
  private roomWallStyle: WallFinishStyle = "paint";
  private roomFloorStyle: FloorFinishStyle = "planks";
  private roomName = "A room of your own";
  private muted = false;
  private gridSnap = false;
  private saveTimer = 0;
  private frameTimes: number[] = [];
  private diagnosticsObjects: ThreeGameDiagnostics["editor"]["objects"] = [];
  private diagnosticsObjectsUpdatedAt = 0;
  private readonly diagnosticsProjection = new THREE.Vector3();
  private catalogCategory: CatalogFilter = "all";
  private catalogQuery = "";
  private catalogPlacement: CatalogPlacementFilter = "all";
  private catalogSize: CatalogSizeFilter = "all";
  private catalogSort: CatalogSort = "catalog";
  private favoriteKinds = new Set<string>(
    JSON.parse(localStorage.getItem("my-little-room-favorites-v1") ?? "[]") as string[],
  );
  private recentKinds: string[] = JSON.parse(
    localStorage.getItem("my-little-room-recent-v1") ?? "[]",
  ) as string[];
  private catalogThumbnailRenderer?: THREE.WebGLRenderer;
  private catalogThumbnailObserver?: IntersectionObserver;
  private catalogThumbnailCache = new Map<string, string>();
  private photoBlob?: Blob;
  private photoUrl?: string;
  private photoCaptureId = 0;
  private firstPerson = false;
  private firstPersonYaw = 0;
  private firstPersonPitch = -0.04;
  private firstPersonHeight = 2.15;
  private readonly firstPersonMinHeight = 1.2;
  private readonly firstPersonMaxHeight = 12;
  private readonly firstPersonHeightStep = 0.5;
  private firstPersonInputs = new Set<string>();
  private firstPersonLook?: { pointerId: number; x: number; y: number };
  private editorCameraState?: {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    target: THREE.Vector3;
    fov: number;
  };
  private editorSelectedId?: string;
  private ambience = new Audio(
    `${import.meta.env.BASE_URL}assets/audio/room-memory-loop.mp3`,
  );
  constructor(private canvas: HTMLCanvasElement) {
    this.surfaces = new SurfaceController(
      document.querySelector<HTMLElement>("#app")!,
    );
    this.renderer = createRenderer(canvas);
    this.renderer.toneMappingExposure = 1.12;
    this.camera.position.set(12, 10, 15);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 2.3, 0);
    this.controls.enableDamping = true;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 32;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minPolarAngle = 0.45;
    this.loadRoomSettings();
    this.createWorld();
    this.bindUI();
    this.bindTouchExtras();
    this.load();
    resizeRenderer(this.renderer, this.camera, 1.7);
    this.publish();
  }
  start() {
    this.loop.start();
  }
  dispose() {
    this.loop.stop();
    this.controls.dispose();
    this.renderer.dispose();
    this.catalogThumbnailObserver?.disconnect();
    this.catalogThumbnailRenderer?.dispose();
    if (this.photoUrl) URL.revokeObjectURL(this.photoUrl);
    clearTimeout(this.saveTimer);
  }
  private createWorld() {
    this.scene.background = new THREE.Color(0x9fa9a1);
    this.scene.fog = new THREE.Fog(0xb9b4a5, 24, 46);
    const hemi = new THREE.HemisphereLight(0xc9dddf, 0x5b382b, 1.9);
    this.scene.add(hemi);
    this.keyLight = new THREE.SpotLight(0xffd69b, 80, 35, 0.65, 0.5, 1.3);
    this.keyLight.position.set(-5, 10, 6);
    this.keyLight.target.position.set(0, 0, 0);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(this.keyLight, this.keyLight.target);
    const fill = new THREE.DirectionalLight(0xaed7e6, 1.6);
    fill.position.set(8, 7, -4);
    this.scene.add(fill);
    this.lampLight = new THREE.PointLight(0xffa94e, 5, 10, 2);
    this.lampLight.position.set(-4, 4, -3);
    this.scene.add(this.lampLight);
    this.floorTex = new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}assets/rug-memory.webp`,
    );
    this.floorTex.colorSpace = THREE.SRGBColorSpace;
    this.rebuildRoom();
    this.addDust();
  }
  private shapeRatios() {
    return {
      width:
        this.roomShape === "u"
          ? 0.22 + this.roomShapeWidth * 0.18
          : 0.35 + this.roomShapeWidth * 0.4,
      depth: 0.35 + this.roomCrossbarDepth * 0.4,
    };
  }
  private doorWall(d: ItemData) {
    return Math.abs(Math.sin(d.rot)) > Math.abs(Math.cos(d.rot))
      ? "left"
      : "back";
  }
  private extensionRect(d: ItemData): RoomRect | undefined {
    if (!ARCHITECTURAL_KINDS.has(d.kind)) return;
    const size = ARCHITECTURAL_SIZES[d.kind as ArchitecturalKind],
      scale = d.scale ?? 1,
      halfWidth = (size.width * scale) / 2,
      depth = size.depth * scale,
      c = Math.cos(d.rot),
      s = Math.sin(d.rot),
      points = [
        [-halfWidth, -0.16],
        [halfWidth, -0.16],
        [-halfWidth, -depth],
        [halfWidth, -depth],
      ].map(([x, z]) => ({
        x: d.x + x * c + z * s,
        z: d.z - x * s + z * c,
      }));
    return {
      minX: Math.min(...points.map((point) => point.x)),
      maxX: Math.max(...points.map((point) => point.x)),
      minZ: Math.min(...points.map((point) => point.z)),
      maxZ: Math.max(...points.map((point) => point.z)),
    };
  }
  private snapDoorToWall(d: ItemData, x: number, z: number) {
    const halfOpening = 1.45 * (d.scale ?? 1),
      minX = -this.roomWidth / 2,
      maxX = this.roomWidth / 2,
      minZ = -this.roomDepth / 2,
      maxZ =
        this.roomShape === "t"
          ? minZ + this.roomDepth * this.shapeRatios().depth
          : this.roomDepth / 2;
    if (this.doorWall(d) === "left") {
      d.rot = Math.PI / 2;
      d.x = minX + 0.08;
      d.z = THREE.MathUtils.clamp(z, minZ + halfOpening, maxZ - halfOpening);
    } else {
      d.rot = 0;
      d.x = THREE.MathUtils.clamp(x, minX + halfOpening, maxX - halfOpening);
      d.z = minZ + 0.08;
    }
    d.y = 0;
    d.supportId = undefined;
  }
  private findClearBackWallPosition(scale = 1) {
    const minX = -this.roomWidth / 2,
      maxX = this.roomWidth / 2,
      minZ = -this.roomDepth / 2,
      halfOpening = 1.45 * scale,
      occupied = this.data
        .filter((item) => Math.abs(item.z - minZ) < 1.1)
        .map((item) => this.items.get(item.id))
        .filter((group): group is THREE.Group => Boolean(group))
        .map((group) => new THREE.Box3().setFromObject(group));
    let bestX = 0,
      bestOverlap = Infinity;
    for (let x = minX + halfOpening; x <= maxX - halfOpening; x += 0.2) {
      let overlap = 0;
      for (const bounds of occupied)
        overlap += Math.max(
          0,
          Math.min(x + halfOpening, bounds.max.x + 0.18) -
            Math.max(x - halfOpening, bounds.min.x - 0.18),
        );
      if (
        overlap < bestOverlap - 0.001 ||
        (Math.abs(overlap - bestOverlap) < 0.001 &&
          Math.abs(x) < Math.abs(bestX))
      ) {
        bestX = x;
        bestOverlap = overlap;
      }
    }
    return bestX;
  }
  private findClearLeftWallPosition(scale = 1) {
    const minX = -this.roomWidth / 2,
      minZ = -this.roomDepth / 2,
      maxZ =
        this.roomShape === "t"
          ? minZ + this.roomDepth * this.shapeRatios().depth
          : this.roomDepth / 2,
      halfOpening = 1.45 * scale,
      occupied = this.data
        .filter((item) => Math.abs(item.x - minX) < 3.8)
        .map((item) => this.items.get(item.id))
        .filter((group): group is THREE.Group => Boolean(group))
        .map((group) => new THREE.Box3().setFromObject(group));
    let bestZ = 0,
      bestOverlap = Infinity;
    for (let z = minZ + halfOpening; z <= maxZ - halfOpening; z += 0.2) {
      let overlap = 0;
      for (const bounds of occupied)
        overlap += Math.max(
          0,
          Math.min(z + halfOpening, bounds.max.z + 0.18) -
            Math.max(z - halfOpening, bounds.min.z - 0.18),
        );
      if (
        overlap < bestOverlap - 0.001 ||
        (Math.abs(overlap - bestOverlap) < 0.001 &&
          Math.abs(z) < Math.abs(bestZ))
      ) {
        bestZ = z;
        bestOverlap = overlap;
      }
    }
    return bestZ;
  }
  private roomRects(forPlacement = false): RoomRect[] {
    const w = this.roomWidth,
      d = this.roomDepth,
      minX = -w / 2,
      maxX = w / 2,
      minZ = -d / 2,
      maxZ = d / 2,
      ratios = this.shapeRatios(),
      cutZ = minZ + d * ratios.depth,
      leftMax = minX + w * ratios.width,
      stemHalf = (w * ratios.width) / 2,
      leg = w * ratios.width;
    let rects: RoomRect[];
    if (this.roomShape === "l")
      rects = forPlacement
        ? [
            { minX, maxX: leftMax, minZ, maxZ },
            { minX, maxX, minZ, maxZ: cutZ },
          ]
        : [
            { minX, maxX, minZ, maxZ: cutZ },
            { minX, maxX: leftMax, minZ: cutZ, maxZ },
          ];
    else if (this.roomShape === "t")
      rects = forPlacement
        ? [
            { minX, maxX, minZ, maxZ: cutZ },
            { minX: -stemHalf, maxX: stemHalf, minZ, maxZ },
          ]
        : [
            { minX, maxX, minZ, maxZ: cutZ },
            { minX: -stemHalf, maxX: stemHalf, minZ: cutZ, maxZ },
          ];
    else if (this.roomShape === "u")
      rects = forPlacement
        ? [
            { minX, maxX: minX + leg, minZ, maxZ },
            { minX: maxX - leg, maxX, minZ, maxZ },
            { minX, maxX, minZ, maxZ: cutZ },
          ]
        : [
            { minX, maxX, minZ, maxZ: cutZ },
            { minX, maxX: minX + leg, minZ: cutZ, maxZ },
            { minX: maxX - leg, maxX, minZ: cutZ, maxZ },
          ];
    else rects = [{ minX, maxX, minZ, maxZ }];
    if (forPlacement)
      for (const door of this.data) {
        const extension = this.extensionRect(door);
        if (extension) rects.push(extension);
      }
    return rects;
  }
  private disposeGroup(group: THREE.Group) {
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => material.dispose());
    });
  }
  private rebuildArchitecturalExtensions() {
    this.architecturalExtensions.forEach((group) => {
      this.scene.remove(group);
      this.disposeGroup(group);
    });
    this.architecturalExtensions.clear();
    for (const data of this.data) {
      if (!ARCHITECTURAL_KINDS.has(data.kind)) continue;
      const extension = buildArchitecturalExtension(
        data.kind as ArchitecturalKind,
        this.roomWallColor,
        this.roomFloorColor,
      );
      this.architecturalExtensions.set(data.id, extension);
      this.scene.add(extension);
      this.syncArchitecturalExtension(data);
    }
  }
  private syncArchitecturalExtension(data: ItemData) {
    const extension = this.architecturalExtensions.get(data.id);
    if (!extension) return;
    extension.position.set(data.x, 0, data.z);
    extension.rotation.y = data.rot;
    extension.scale.setScalar(data.scale ?? 1);
  }
  private rebuildRoom() {
    if (this.roomGroup) {
      this.scene.remove(this.roomGroup);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      this.roomGroup.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          geometries.add(o.geometry);
          const meshMaterials = Array.isArray(o.material)
            ? o.material
            : [o.material];
          meshMaterials.forEach((material) => materials.add(material));
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial)
          material.map?.dispose();
        material.dispose();
      });
    }
    this.roomWalls = [];
    const room = new THREE.Group();
    this.roomGroup = room;
    const w = this.roomWidth,
      d = this.roomDepth,
      minX = -w / 2,
      minZ = -d / 2;
    const floorMap = createFloorFinishTexture(
        this.roomFloorStyle,
        this.roomFloorColor,
      ),
      wallMap = createWallFinishTexture(
        this.roomWallStyle,
        this.roomWallColor,
      ),
      floorMat = new THREE.MeshStandardMaterial({
        color: floorMap ? 0xffffff : this.roomFloorColor,
        ...(floorMap ? { map: floorMap } : {}),
        roughness:
          this.roomFloorStyle === "tile"
            ? 0.48
            : this.roomFloorStyle === "concrete"
              ? 0.94
              : 0.72,
      }),
      seamMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.roomFloorColor).offsetHSL(0, 0, -0.18),
        transparent: true,
        opacity: this.roomFloorStyle === "planks" ? 0.2 : 0,
      }),
      createWallMat = () =>
        new THREE.MeshStandardMaterial({
          color: wallMap ? 0xffffff : this.roomWallColor,
          ...(wallMap ? { map: wallMap } : {}),
          roughness: 0.92,
          transparent: true,
        }),
      createBaseMat = () =>
        new THREE.MeshStandardMaterial({
          color: 0xf2e5cf,
          roughness: 0.7,
          transparent: true,
        });
    const createWallSide = (
      side: RoomWallSide,
      outwardNormal: THREE.Vector3,
    ) => {
      const wallMaterial = createWallMat(),
        baseMaterial = createBaseMat(),
        group = new THREE.Group();
      group.name = `${side}-room-wall`;
      room.add(group);
      this.roomWalls.push({
        side,
        outwardNormal,
        materials: [wallMaterial, baseMaterial],
        opacity: 1,
      });
      return { group, wallMaterial, baseMaterial };
    };
    const walls = {
        back: createWallSide("back", new THREE.Vector3(0, 0, -1)),
        front: createWallSide("front", new THREE.Vector3(0, 0, 1)),
        left: createWallSide("left", new THREE.Vector3(-1, 0, 0)),
        right: createWallSide("right", new THREE.Vector3(1, 0, 0)),
      },
      roomRects = this.roomRects();
    for (const rect of roomRects) {
      const rw = rect.maxX - rect.minX,
        rd = rect.maxZ - rect.minZ,
        cx = (rect.minX + rect.maxX) / 2,
        cz = (rect.minZ + rect.maxZ) / 2;
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(rw, 0.28, rd),
        floorMat,
      );
      floor.receiveShadow = true;
      floor.position.set(cx, -0.15, cz);
      room.add(floor);
      for (let x = Math.ceil(rect.minX) + 1; x < rect.maxX; x++) {
        const seam = new THREE.Mesh(
          new THREE.BoxGeometry(0.025, 0.01, Math.max(0.05, rd - 0.16)),
          seamMat,
        );
        seam.position.set(x, 0.005, cz);
        room.add(seam);
      }
    }
    const horizontalWall = (
      side: "back" | "front",
      z: number,
      a: number,
      b: number,
    ) => {
      const wallSide = walls[side],
        inward = side === "back" ? 1 : -1;
      const length = b - a,
        wall = new THREE.Mesh(
          new THREE.BoxGeometry(length, 7, 0.18),
          wallSide.wallMaterial,
        ),
        base = new THREE.Mesh(
          new THREE.BoxGeometry(length, 0.32, 0.22),
          wallSide.baseMaterial,
        );
      wall.position.set((a + b) / 2, 3.5, z + inward * 0.05);
      wall.receiveShadow = true;
      base.position.set((a + b) / 2, 0.18, z + inward * 0.2);
      wallSide.group.add(wall, base);
    };
    const verticalWall = (
      side: "left" | "right",
      x: number,
      a: number,
      b: number,
    ) => {
      const wallSide = walls[side],
        inward = side === "left" ? 1 : -1;
      const length = b - a,
        wall = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 7, length),
          wallSide.wallMaterial,
        ),
        base = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.32, length),
          wallSide.baseMaterial,
        );
      wall.position.set(x + inward * 0.1, 3.5, (a + b) / 2);
      wall.receiveShadow = true;
      base.position.set(x + inward * 0.25, 0.18, (a + b) / 2);
      wallSide.group.add(wall, base);
    };
    const wallSegments = (
      start: number,
      end: number,
      cuts: Array<[number, number]>,
      draw: (a: number, b: number) => void,
    ) => {
      let cursor = start;
      for (const [rawStart, rawEnd] of cuts.sort((a, b) => a[0] - b[0])) {
        const cutStart = THREE.MathUtils.clamp(rawStart, start, end),
          cutEnd = THREE.MathUtils.clamp(rawEnd, start, end);
        if (cutStart > cursor + 0.04) draw(cursor, cutStart);
        cursor = Math.max(cursor, cutEnd);
      }
      if (cursor < end - 0.04) draw(cursor, end);
    };
    const doors = this.data.filter((item) =>
        ARCHITECTURAL_KINDS.has(item.kind),
      ),
      backCuts = doors
        .filter((door) => this.doorWall(door) === "back")
        .map(
          (door) =>
            [
              door.x - 1.46 * (door.scale ?? 1),
              door.x + 1.46 * (door.scale ?? 1),
            ] as [number, number],
        ),
      leftCuts = doors
        .filter((door) => this.doorWall(door) === "left")
        .map(
          (door) =>
            [
              door.z - 1.46 * (door.scale ?? 1),
              door.z + 1.46 * (door.scale ?? 1),
            ] as [number, number],
        );
    const sameEdge = (a: number, b: number) => Math.abs(a - b) < 0.001;
    for (const rect of roomRects) {
      const backNeighbors = roomRects
          .filter(
            (other) =>
              other !== rect && sameEdge(other.maxZ, rect.minZ),
          )
          .map((other) => [other.minX, other.maxX] as [number, number]),
        frontNeighbors = roomRects
          .filter(
            (other) =>
              other !== rect && sameEdge(other.minZ, rect.maxZ),
          )
          .map((other) => [other.minX, other.maxX] as [number, number]),
        leftNeighbors = roomRects
          .filter(
            (other) =>
              other !== rect && sameEdge(other.maxX, rect.minX),
          )
          .map((other) => [other.minZ, other.maxZ] as [number, number]),
        rightNeighbors = roomRects
          .filter(
            (other) =>
              other !== rect && sameEdge(other.minX, rect.maxX),
          )
          .map((other) => [other.minZ, other.maxZ] as [number, number]);

      wallSegments(
        rect.minX,
        rect.maxX,
        [
          ...backNeighbors,
          ...(sameEdge(rect.minZ, minZ) ? backCuts : []),
        ],
        (a, b) => horizontalWall("back", rect.minZ, a, b),
      );
      wallSegments(rect.minX, rect.maxX, frontNeighbors, (a, b) =>
        horizontalWall("front", rect.maxZ, a, b),
      );
      wallSegments(
        rect.minZ,
        rect.maxZ,
        [
          ...leftNeighbors,
          ...(sameEdge(rect.minX, minX) ? leftCuts : []),
        ],
        (a, b) => verticalWall("left", rect.minX, a, b),
      );
      wallSegments(rect.minZ, rect.maxZ, rightNeighbors, (a, b) =>
        verticalWall("right", rect.maxX, a, b),
      );
    }
    for (const door of doors) {
      const scale = door.scale ?? 1,
        openingHeight = Math.min(6.82, 4.38 * scale),
        lintelHeight = 7 - openingHeight,
        openingWidth = 2.92 * scale,
        lintel =
          this.doorWall(door) === "back"
            ? new THREE.Mesh(
                new THREE.BoxGeometry(openingWidth, lintelHeight, 0.18),
                walls.back.wallMaterial,
              )
            : new THREE.Mesh(
                new THREE.BoxGeometry(0.18, lintelHeight, openingWidth),
                walls.left.wallMaterial,
              );
      lintel.position.set(
        this.doorWall(door) === "back" ? door.x : minX + 0.1,
        openingHeight + lintelHeight / 2,
        this.doorWall(door) === "back" ? minZ + 0.05 : door.z,
      );
      lintel.receiveShadow = true;
      (this.doorWall(door) === "back" ? walls.back.group : walls.left.group).add(
        lintel,
      );
    }
    this.scene.add(room);
    this.rebuildArchitecturalExtensions();
  }

  private updateRoomWallTransparency() {
    this.wallViewDirection.copy(this.camera.position).sub(this.controls.target);
    this.wallViewDirection.y = 0;
    if (this.wallViewDirection.lengthSq() > 0.0001)
      this.wallViewDirection.normalize();

    for (const wall of this.roomWalls) {
      const cameraOnOutside = this.firstPerson
        ? 0
        : THREE.MathUtils.smoothstep(
            wall.outwardNormal.dot(this.wallViewDirection),
            0.08,
            0.32,
          );
      const opacity = THREE.MathUtils.lerp(1, 0.06, cameraOnOutside);
      wall.opacity = opacity;
      for (const material of wall.materials) {
        material.opacity = opacity;
        material.depthWrite = opacity > 0.98;
      }
    }
  }
  private addDust() {
    const geo = new THREE.BufferGeometry();
    const p = [];
    for (let i = 0; i < 110; i++)
      p.push(
        (Math.random() - 0.5) * 13,
        Math.random() * 6,
        (Math.random() - 0.5) * 10,
      );
    geo.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    this.dust = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xffe2a8,
        size: 0.035,
        transparent: true,
        opacity: 0.5,
      }),
    );
    this.scene.add(this.dust);
  }
  private bindUI() {
    const $ = (s: string) => document.querySelector<HTMLElement>(s)!;
    const widthInput = $("#room-width") as HTMLInputElement,
      depthInput = $("#room-depth") as HTMLInputElement,
      shapeWidthInput = $("#shape-width") as HTMLInputElement,
      shapeDepthInput = $("#shape-depth") as HTMLInputElement;
    const roomName = $("#room-name"),
      roomNameInput = $("#room-name-input") as HTMLInputElement,
      renameForm = $("#rename-form") as HTMLFormElement,
      renameButton = $("#rename-room") as HTMLButtonElement,
      openCatalog = $("#open-catalog") as HTMLButtonElement,
      openRoom = $("#open-room") as HTMLButtonElement,
      openFiles = $("#open-files") as HTMLButtonElement,
      openPhoto = $("#open-photo") as HTMLButtonElement,
      openHelp = $("#open-help") as HTMLButtonElement,
      moreToggle = $("#more-toggle") as HTMLButtonElement;
    this.surfaces.register("catalog", openCatalog, {
      modal: () => this.compactToolsQuery.matches,
      onRequestClose: () => this.surfaces.close("catalog"),
    });
    this.surfaces.register("room-panel", openRoom, {
      modal: () => this.compactToolsQuery.matches,
      onRequestClose: () => this.surfaces.close("room-panel"),
    });
    this.surfaces.register("file-panel", openFiles, {
      modal: () => this.compactToolsQuery.matches,
      onRequestClose: () => this.surfaces.close("file-panel"),
    });
    this.surfaces.register("secondary-actions", moreToggle, {
      modal: () => this.compactToolsQuery.matches,
      onRequestClose: () => this.surfaces.close("secondary-actions"),
    });
    this.surfaces.register("selection", undefined, {
      closeClass: "hidden",
      transitionMs: 200,
    });
    this.surfaces.register("placement-toolbar", undefined, {
      transitionMs: 0,
    });
    this.surfaces.register("walk-hud", undefined, { transitionMs: 0 });
    this.surfaces.register("photo-studio", openPhoto, {
      modal: true,
      onRequestClose: () => this.closePhotoStudio(),
    });
    this.surfaces.register("help-dialog", openHelp, {
      modal: true,
      onRequestClose: () => this.surfaces.close("help-dialog"),
    });
    this.surfaces.register("welcome", undefined, {
      closeClass: "gone",
      modal: true,
      transitionMs: 700,
    });
    const syncCompactTools = () => {
      moreToggle.hidden = false;
      this.surfaces.setPersistent("secondary-actions", false);
      ["catalog", "room-panel", "file-panel"].forEach((id) =>
        this.surfaces.refreshModalState(id),
      );
    };
    syncCompactTools();
    this.compactToolsQuery.addEventListener("change", syncCompactTools);
    $("#catalog-count").textContent =
      `THE TOY CHEST · ${CATALOG.length} PIECES`;
    $("#begin").onclick = () => {
      this.surfaces.close("welcome", false);
      openCatalog.focus({ preventScroll: true });
      this.audio("begin");
    };
    this.surfaces.open("welcome", $("#begin"));
    openCatalog.onclick = () => {
      this.surfaces.close("room-panel", false);
      this.surfaces.close("file-panel", false);
      if (this.compactToolsQuery.matches)
        this.surfaces.close("secondary-actions", false);
      this.surfaces.open("catalog", $("#catalog-add-tab"));
      this.syncSelectionSurface();
    };
    $("#close-catalog").onclick = () => {
      this.surfaces.close("catalog");
      this.syncSelectionSurface();
    };
    openRoom.onclick = () => {
      this.surfaces.close("catalog", false);
      this.surfaces.close("file-panel", false);
      if (this.compactToolsQuery.matches)
        this.surfaces.close("secondary-actions", false);
      this.surfaces.open("room-panel", $("#close-room"));
      this.syncSelectionSurface();
    };
    $("#close-room").onclick = () => {
      this.surfaces.close("room-panel");
      this.syncSelectionSurface();
    };
    this.syncRoomNameControl();
    const closeRename = (save: boolean) => {
      if (save) {
        this.roomName = this.cleanRoomName(roomNameInput.value);
        this.syncRoomNameControl();
        this.saveRoomSettings();
        this.announce(`Room renamed ${this.roomName}.`);
      }
      renameForm.hidden = true;
      renameForm.inert = true;
      roomName.hidden = false;
      renameButton.setAttribute("aria-expanded", "false");
      renameButton.focus();
    };
    renameButton.onclick = () => {
      roomNameInput.value = this.roomName;
      roomName.hidden = true;
      renameForm.hidden = false;
      renameForm.inert = false;
      renameButton.setAttribute("aria-expanded", "true");
      roomNameInput.focus();
      roomNameInput.select();
    };
    renameForm.onsubmit = (event) => {
      event.preventDefault();
      closeRename(true);
    };
    $("#cancel-rename").onclick = () => closeRename(false);
    roomNameInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRename(false);
      }
    });
    renameForm.inert = true;
    openFiles.onclick = () => {
      this.surfaces.close("catalog", false);
      this.surfaces.close("room-panel", false);
      if (this.compactToolsQuery.matches)
        this.surfaces.close("secondary-actions", false);
      this.surfaces.open("file-panel", $("#close-files"));
      this.syncSelectionSurface();
    };
    $("#close-files").onclick = () => {
      this.surfaces.close("file-panel");
      this.syncSelectionSurface();
    };
    moreToggle.onclick = () => {
      this.surfaces.close("catalog", false);
      this.surfaces.close("room-panel", false);
      this.surfaces.close("file-panel", false);
      this.surfaces.open("secondary-actions", $("#close-more"));
      this.syncSelectionSurface();
    };
    $("#close-more").onclick = () => {
      this.surfaces.close("secondary-actions");
      this.syncSelectionSurface();
    };
    $("#save-xml").onclick = () => this.saveDesignXml();
    $("#load-xml").onclick = () =>
      (document.querySelector("#load-xml-file") as HTMLInputElement).click();
    $("#load-xml-file").addEventListener("change", async (event) => {
      const input = event.currentTarget as HTMLInputElement,
        file = input.files?.[0];
      if (!file) return;
      await this.loadDesignXml(file);
      input.value = "";
    });
    $("#open-photo").onclick = () => void this.openPhotoStudio();
    $("#walk-photo").onclick = () => void this.openPhotoStudio();
    $("#walk-toggle").onclick = () => this.toggleFirstPerson();
    $("#close-photo").onclick = () => this.closePhotoStudio();
    $("#photo-studio").addEventListener("click", (event) => {
      if (event.target === event.currentTarget) this.closePhotoStudio();
    });
    $("#retake-photo").onclick = () => void this.retakePhoto();
    $("#download-photo").onclick = () => this.downloadPhoto();
    $("#share-photo").onclick = () => void this.sharePhoto();
    $("#placement-confirm").onclick = () => this.commitPlacement();
    $("#placement-cancel").onclick = () => this.cancelPlacement();
    $("#placement-rotate").onclick = () => {
      if (!this.placement) return;
      this.placement.data.rot += Math.PI / 12;
      this.placement.group.rotation.y = this.placement.data.rot;
      this.refreshPlacementValidity();
    };
    openHelp.onclick = () => {
      if (this.compactToolsQuery.matches)
        this.surfaces.close("secondary-actions", false);
      this.surfaces.open("help-dialog", $("#close-help"));
    };
    $("#close-help").onclick = () => this.surfaces.close("help-dialog");
    $("#help-dialog").addEventListener("click", (event) => {
      if (event.target === event.currentTarget)
        this.surfaces.close("help-dialog");
    });
    $("#dismiss-walk-hint").onclick = () => {
      localStorage.setItem("my-little-room-walk-hint-v1", "dismissed");
      $("#walk-touch-hint").hidden = true;
    };
    widthInput.addEventListener("input", () =>
      this.setRoomSize(Number(widthInput.value), this.roomDepth),
    );
    depthInput.addEventListener("input", () =>
      this.setRoomSize(this.roomWidth, Number(depthInput.value)),
    );
    shapeWidthInput.addEventListener("input", () =>
      this.setRoomProportions(
        Number(shapeWidthInput.value) / 100,
        this.roomCrossbarDepth,
      ),
    );
    shapeDepthInput.addEventListener("input", () =>
      this.setRoomProportions(
        this.roomShapeWidth,
        Number(shapeDepthInput.value) / 100,
      ),
    );
    document
      .querySelectorAll<HTMLButtonElement>("[data-shape]")
      .forEach(
        (b) =>
          (b.onclick = () => this.setRoomShape(b.dataset.shape as RoomShape)),
      );
    document.querySelectorAll<HTMLButtonElement>("[data-room]").forEach(
      (b) =>
        (b.onclick = () => {
          const sizes: Record<string, [number, number]> = {
            cozy: [12, 9],
            square: [12, 12],
            wide: [18, 10],
            deep: [12, 15],
          };
          const size = sizes[b.dataset.room ?? "cozy"];
          this.setRoomSize(size[0], size[1]);
        }),
    );
    document
      .querySelectorAll<HTMLButtonElement>("[data-wall-color]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            this.setRoomFinish("wall", button.dataset.wallColor!)),
      );
    document
      .querySelectorAll<HTMLButtonElement>("[data-floor-color]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            this.setRoomFinish("floor", button.dataset.floorColor!)),
      );
    document
      .querySelectorAll<HTMLButtonElement>("[data-wall-style]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            this.setRoomStyle("wall", button.dataset.wallStyle!)),
      );
    document
      .querySelectorAll<HTMLButtonElement>("[data-floor-style]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            this.setRoomStyle("floor", button.dataset.floorStyle!)),
      );
    $("#wall-color-custom").addEventListener("input", (event) =>
      this.setRoomFinish("wall", (event.target as HTMLInputElement).value),
    );
    $("#floor-color-custom").addEventListener("input", (event) =>
      this.setRoomFinish("floor", (event.target as HTMLInputElement).value),
    );
    this.syncRoomControls();
    this.syncSnapControl();
    document
      .querySelectorAll<HTMLDetailsElement>(".room-section")
      .forEach((section) =>
        section.addEventListener("toggle", () => {
          if (!section.open) return;
          document
            .querySelectorAll<HTMLDetailsElement>(".room-section")
            .forEach((other) => {
              if (other !== section) other.open = false;
            });
        }),
      );
    $("#catalog-search").addEventListener("submit", (e) => e.preventDefault());
    $("#item-search").addEventListener("input", (e) => {
      this.catalogQuery = (e.target as HTMLInputElement).value
        .trim()
        .toLowerCase();
      document
        .querySelector(".catalog-discovery")
        ?.classList.toggle("searching", Boolean(this.catalogQuery));
      this.renderCatalog(this.catalogCategory);
    });
    for (const id of ["catalog-placement", "catalog-size", "catalog-sort"])
      $(`#${id}`).addEventListener("change", () => {
        this.catalogPlacement = (
          $("#catalog-placement") as HTMLSelectElement
        ).value as CatalogPlacementFilter;
        this.catalogSize = (
          $("#catalog-size") as HTMLSelectElement
        ).value as CatalogSizeFilter;
        this.catalogSort = (
          $("#catalog-sort") as HTMLSelectElement
        ).value as CatalogSort;
        this.renderCatalog(this.catalogCategory);
      });
    const setCatalogView = (view: "add" | "room") => {
      const addTab = $("#catalog-add-tab") as HTMLButtonElement,
        roomTab = $("#catalog-room-tab") as HTMLButtonElement,
        addView = $("#catalog-add-view"),
        roomView = $("#catalog-room-view");
      const roomActive = view === "room";
      addTab.setAttribute("aria-selected", String(!roomActive));
      roomTab.setAttribute("aria-selected", String(roomActive));
      addTab.tabIndex = roomActive ? -1 : 0;
      roomTab.tabIndex = roomActive ? 0 : -1;
      addView.hidden = roomActive;
      addView.inert = roomActive;
      roomView.hidden = !roomActive;
      roomView.inert = !roomActive;
      if (roomActive) this.renderObjectManager();
    };
    $("#catalog-add-tab").onclick = () => setCatalogView("add");
    $("#catalog-room-tab").onclick = () => setCatalogView("room");
    document
      .querySelector(".catalog-tabs")
      ?.addEventListener("keydown", (event) => {
        const keyboardEvent = event as KeyboardEvent;
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(keyboardEvent.key))
          return;
        keyboardEvent.preventDefault();
        const room = keyboardEvent.key === "ArrowRight" || keyboardEvent.key === "End";
        setCatalogView(room ? "room" : "add");
        (room ? $("#catalog-room-tab") : $("#catalog-add-tab")).focus();
      });
    document
      .querySelectorAll<HTMLButtonElement>("[data-object-action]")
      .forEach((button) => {
        button.onclick = () => this.runObjectManagerAction(button.dataset.objectAction!);
      });
    $("#reset-view").onclick = () => {
      this.resetCamera();
      this.announce("Room view reset to fit the full room.");
    };
    $("#time-toggle").onclick = () => this.toggleTime();
    $("#snap-toggle").onclick = () => {
      this.gridSnap = !this.gridSnap;
      this.syncSnapControl();
      this.saveRoomSettings();
      this.announce(`Grid snapping ${this.gridSnap ? "on" : "off"}.`);
    };
    $("#undo").onclick = () => this.undo();
    $("#redo").onclick = () => this.redo();
    $("#rotate-left").onclick = () => this.modify(-Math.PI / 12);
    $("#rotate-right").onclick = () => this.modify(Math.PI / 12);
    $("#lower").onclick = () => this.adjustHeight(-0.2);
    $("#raise").onclick = () => this.adjustHeight(0.2);
    $("#color").addEventListener("input", (event) =>
      this.setSelectedColor((event.target as HTMLInputElement).value),
    );
    $("#duplicate").onclick = () => this.duplicate();
    $("#align-wall").onclick = () => this.alignSelectedToWall();
    $("#remove").onclick = () => this.remove();
    $("#sound").onclick = () => this.toggleSound();
    this.syncSoundControl();
    this.applyTimeOfDay();
    document.querySelectorAll<HTMLButtonElement>("#categories button").forEach(
      (b) =>
        (b.onclick = () => {
          document
            .querySelectorAll("#categories button")
            .forEach((x) => {
              x.classList.remove("active");
              x.setAttribute("aria-pressed", "false");
            });
          b.classList.add("active");
          b.setAttribute("aria-pressed", "true");
          b.scrollIntoView({ block: "nearest", inline: "center" });
          this.renderCatalog((b.dataset.cat || "all") as CatalogFilter);
        }),
    );
    this.renderCatalog("all");
    this.renderObjectManager();
    this.canvas.addEventListener("pointerdown", (e) => this.pointerDown(e));
    this.canvas.addEventListener("pointermove", (e) => this.pointerMove(e));
    window.addEventListener("pointerup", () => this.pointerUp());
    this.bindFirstPersonControls();
    window.addEventListener("keydown", (e) => {
      if (e.defaultPrevented) return;
      if ((e.target as HTMLElement).matches("input,textarea,[contenteditable]"))
        return;
      if (this.firstPerson) {
        if (e.key === "Escape") this.exitFirstPerson();
        else if (e.code === "KeyR") {
          this.setFirstPersonHeight(
            this.firstPersonHeight + this.firstPersonHeightStep,
          );
          e.preventDefault();
        } else if (e.code === "KeyF") {
          this.setFirstPersonHeight(
            this.firstPersonHeight - this.firstPersonHeightStep,
          );
          e.preventDefault();
        } else if (this.isFirstPersonMovementKey(e.code)) {
          this.firstPersonInputs.add(e.code);
          e.preventDefault();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? this.redo() : this.undo();
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        this.surfaces.open("help-dialog", $("#close-help"));
      } else if (e.key === "Escape" && this.placement) {
        e.preventDefault();
        this.cancelPlacement();
      } else if (e.key === "Enter" && this.placement) {
        e.preventDefault();
        this.commitPlacement();
      } else if (e.key === "Delete" || e.key === "Backspace") this.remove();
      else if (
        this.selected &&
        document.activeElement === this.canvas &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 0.5 : 0.1;
        if (e.key === "ArrowLeft") this.nudgeSelected(-step, 0);
        else if (e.key === "ArrowRight") this.nudgeSelected(step, 0);
        else if (e.key === "ArrowUp") this.nudgeSelected(0, -step);
        else this.nudgeSelected(0, step);
      }
      else if (e.key.toLowerCase() === "q") this.modify(-Math.PI / 12);
      else if (e.key.toLowerCase() === "e") this.modify(Math.PI / 12);
      else if (e.key.toLowerCase() === "r") this.adjustHeight(0.2);
      else if (e.key.toLowerCase() === "f") this.adjustHeight(-0.2);
      else if (e.key === "Escape") {
        const openSurface = [
          ...(this.compactToolsQuery.matches ? ["secondary-actions"] : []),
          "file-panel",
          "room-panel",
          "catalog",
        ].find((id) => this.surfaces.isOpen(id));
        if (openSurface) {
          this.surfaces.close(openSurface);
          this.syncSelectionSurface();
        } else this.select(undefined);
      }
    });
  }
  private loadRoomSettings() {
    try {
      const saved = JSON.parse(
        localStorage.getItem("my-little-room-settings-v1") ?? "null",
      ) as {
        width?: number;
        depth?: number;
        shape?: RoomShape;
        shapeWidth?: number;
        crossbarDepth?: number;
        wallColor?: number;
        floorColor?: number;
        wallStyle?: WallFinishStyle;
        floorStyle?: FloorFinishStyle;
        muted?: boolean;
        evening?: boolean;
        gridSnap?: boolean;
        name?: string;
      } | null;
      if (saved) {
        this.roomWidth = THREE.MathUtils.clamp(saved.width ?? 14, 10, 20);
        this.roomDepth = THREE.MathUtils.clamp(saved.depth ?? 11, 8, 16);
        this.roomShapeWidth = THREE.MathUtils.clamp(
          saved.shapeWidth ?? 0.55,
          0,
          1,
        );
        this.roomCrossbarDepth = THREE.MathUtils.clamp(
          saved.crossbarDepth ?? 0.55,
          0,
          1,
        );
        if (Number.isInteger(saved.wallColor))
          this.roomWallColor = THREE.MathUtils.clamp(
            saved.wallColor!,
            0,
            0xffffff,
          );
        if (Number.isInteger(saved.floorColor))
          this.roomFloorColor = THREE.MathUtils.clamp(
            saved.floorColor!,
            0,
            0xffffff,
          );
        if (WALL_FINISH_STYLES.includes(saved.wallStyle ?? "paint"))
          this.roomWallStyle = saved.wallStyle ?? "paint";
        if (FLOOR_FINISH_STYLES.includes(saved.floorStyle ?? "planks"))
          this.roomFloorStyle = saved.floorStyle ?? "planks";
        this.muted = saved.muted ?? false;
        this.evening = saved.evening ?? false;
        this.gridSnap = saved.gridSnap ?? false;
        this.roomName = this.cleanRoomName(saved.name ?? this.roomName);
        if (["rectangle", "l", "t", "u"].includes(saved.shape ?? ""))
          this.roomShape = saved.shape!;
      }
    } catch {}
  }
  private syncRoomControls() {
    const width = document.querySelector<HTMLInputElement>("#room-width"),
      depth = document.querySelector<HTMLInputElement>("#room-depth"),
      shapeWidth = document.querySelector<HTMLInputElement>("#shape-width"),
      shapeDepth = document.querySelector<HTMLInputElement>("#shape-depth"),
      tuning = document.querySelector<HTMLElement>("#shape-tuning");
    if (!width || !depth || !shapeWidth || !shapeDepth || !tuning) return;
    width.value = String(this.roomWidth);
    depth.value = String(this.roomDepth);
    shapeWidth.value = String(Math.round(this.roomShapeWidth * 100));
    shapeDepth.value = String(Math.round(this.roomCrossbarDepth * 100));
    width.setAttribute("aria-valuetext", `${this.roomWidth} room units wide`);
    depth.setAttribute("aria-valuetext", `${this.roomDepth} room units deep`);
    shapeWidth.setAttribute(
      "aria-valuetext",
      `${Math.round(this.roomShapeWidth * 100)} percent`,
    );
    shapeDepth.setAttribute(
      "aria-valuetext",
      `${Math.round(this.roomCrossbarDepth * 100)} percent`,
    );
    const wallHex = `#${new THREE.Color(this.roomWallColor).getHexString()}`,
      floorHex = `#${new THREE.Color(this.roomFloorColor).getHexString()}`;
    document.querySelector<HTMLInputElement>("#wall-color-custom")!.value =
      wallHex;
    document.querySelector<HTMLInputElement>("#floor-color-custom")!.value =
      floorHex;
    document
      .querySelectorAll<HTMLButtonElement>("[data-wall-color]")
      .forEach((button) => {
        const active = button.dataset.wallColor === wallHex;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    document
      .querySelectorAll<HTMLButtonElement>("[data-wall-style]")
      .forEach((button) => {
        const active = button.dataset.wallStyle === this.roomWallStyle;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    document
      .querySelectorAll<HTMLButtonElement>("[data-floor-style]")
      .forEach((button) => {
        const active = button.dataset.floorStyle === this.roomFloorStyle;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    document
      .querySelectorAll<HTMLButtonElement>("[data-floor-color]")
      .forEach((button) => {
        const active = button.dataset.floorColor === floorHex;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    const ratios = this.shapeRatios();
    document.querySelector("#room-width-value")!.textContent = String(
      this.roomWidth,
    );
    document.querySelector("#room-depth-value")!.textContent = String(
      this.roomDepth,
    );
    document.querySelector("#shape-width-value")!.textContent =
      `${Math.round(ratios.width * 100)}%`;
    document.querySelector("#shape-depth-value")!.textContent =
      `${Math.round(ratios.depth * 100)}%`;
    document.querySelector("#shape-width-label")!.textContent =
      this.roomShape === "l"
        ? "Wing width"
        : this.roomShape === "t"
          ? "Stem width"
          : "Leg width";
    tuning.hidden = this.roomShape === "rectangle";
    document
      .querySelectorAll<HTMLButtonElement>("[data-shape]")
      .forEach((b) => {
        const active = b.dataset.shape === this.roomShape;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", String(active));
      });
  }
  private cleanRoomName(value: string) {
    return (
      value.replace(/\s+/g, " ").trim().slice(0, 60) || "A room of your own"
    );
  }
  private syncRoomNameControl() {
    const heading = document.querySelector<HTMLElement>("#room-name");
    if (heading) heading.textContent = this.roomName;
    document.title = `${this.roomName} · My Little Room`;
  }
  private saveRoomSettings() {
    localStorage.setItem(
      "my-little-room-settings-v1",
      JSON.stringify({
        width: this.roomWidth,
        depth: this.roomDepth,
        shape: this.roomShape,
        shapeWidth: this.roomShapeWidth,
        crossbarDepth: this.roomCrossbarDepth,
        wallColor: this.roomWallColor,
        floorColor: this.roomFloorColor,
        wallStyle: this.roomWallStyle,
        floorStyle: this.roomFloorStyle,
        muted: this.muted,
        evening: this.evening,
        gridSnap: this.gridSnap,
        name: this.roomName,
      }),
    );
  }
  private setFileStatus(message: string, state?: "success" | "error") {
    const status = document.querySelector<HTMLElement>("#file-status");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("success", state === "success");
    status.classList.toggle("error", state === "error");
  }
  private saveDesignXml() {
    const xml = document.implementation.createDocument(
        "",
        "my-little-room",
        null,
      ),
      root = xml.documentElement,
      room = xml.createElement("room"),
      preferences = xml.createElement("preferences"),
      items = xml.createElement("items");
    root.setAttribute("version", "1");
    root.setAttribute("saved-at", new Date().toISOString());
    root.setAttribute("name", this.roomName);
    room.setAttribute("width", String(this.roomWidth));
    room.setAttribute("depth", String(this.roomDepth));
    room.setAttribute("shape", this.roomShape);
    room.setAttribute("shape-width", String(this.roomShapeWidth));
    room.setAttribute("crossbar-depth", String(this.roomCrossbarDepth));
    room.setAttribute(
      "wall-color",
      `#${new THREE.Color(this.roomWallColor).getHexString()}`,
    );
    room.setAttribute(
      "floor-color",
      `#${new THREE.Color(this.roomFloorColor).getHexString()}`,
    );
    room.setAttribute("wall-style", this.roomWallStyle);
    room.setAttribute("floor-style", this.roomFloorStyle);
    preferences.setAttribute("time", this.evening ? "evening" : "afternoon");
    preferences.setAttribute("muted", String(this.muted));
    items.setAttribute("count", String(this.data.length));
    for (const data of this.data) {
      const item = xml.createElement("item");
      item.setAttribute("id", data.id);
      item.setAttribute("kind", data.kind);
      item.setAttribute("name", data.name);
      item.setAttribute("category", data.category);
      item.setAttribute("x", String(data.x));
      item.setAttribute("y", String(data.y ?? 0));
      item.setAttribute("z", String(data.z));
      item.setAttribute("rotation", String(data.rot));
      item.setAttribute(
        "color",
        `#${new THREE.Color(data.color).getHexString()}`,
      );
      item.setAttribute("scale", String(data.scale ?? 1));
      if (data.supportId) item.setAttribute("support-id", data.supportId);
      items.appendChild(item);
    }
    root.append(room, preferences, items);
    const contents = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(xml)}\n`,
      url = URL.createObjectURL(
        new Blob([contents], { type: "application/xml;charset=utf-8" }),
      ),
      link = document.createElement("a"),
      date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `my-little-room-${date}.xml`;
    link.click();
    URL.revokeObjectURL(url);
    this.setFileStatus(
      `Saved ${this.data.length} ${this.data.length === 1 ? "piece" : "pieces"} to ${link.download}.`,
      "success",
    );
    this.audio("chime");
  }
  private parseDesignXml(contents: string): ImportedDesign {
    const xml = new DOMParser().parseFromString(contents, "application/xml"),
      parseError = xml.querySelector("parsererror"),
      root = xml.documentElement;
    if (parseError) throw new Error("This is not a valid XML file.");
    if (root.tagName !== "my-little-room")
      throw new Error("This XML file is not a My Little Room design.");
    if (root.getAttribute("version") !== "1")
      throw new Error("This design uses an unsupported file version.");
    const room = root.getElementsByTagName("room")[0],
      preferences = root.getElementsByTagName("preferences")[0],
      itemElements = [...root.getElementsByTagName("item")];
    if (!room) throw new Error("The design file has no room settings.");
    if (itemElements.length > 1000)
      throw new Error("This design contains too many objects to load.");
    const number = (
        element: Element,
        attribute: string,
        min: number,
        max: number,
      ) => {
        const value = Number(element.getAttribute(attribute));
        if (!Number.isFinite(value) || value < min || value > max)
          throw new Error(`Invalid ${attribute} value in the design file.`);
        return value;
      },
      color = (element: Element, attribute: string) => {
        const value = element.getAttribute(attribute) ?? "";
        if (!/^#[0-9a-f]{6}$/i.test(value))
          throw new Error(`Invalid ${attribute} in the design file.`);
        return Number.parseInt(value.slice(1), 16);
      },
      wallStyle = room.getAttribute("wall-style") ?? "paint",
      floorStyle = room.getAttribute("floor-style") ?? "planks",
      shape = room.getAttribute("shape") as RoomShape;
    if (!["rectangle", "l", "t", "u"].includes(shape))
      throw new Error("The design has an unknown room shape.");
    if (!WALL_FINISH_STYLES.includes(wallStyle as WallFinishStyle))
      throw new Error("The design has an unknown wallpaper pattern.");
    if (!FLOOR_FINISH_STYLES.includes(floorStyle as FloorFinishStyle))
      throw new Error("The design has an unknown floor material.");
    const ids = new Set<string>(),
      importedItems = itemElements.map((element) => {
        const id = element.getAttribute("id") ?? "",
          kind = element.getAttribute("kind") ?? "",
          catalogItem = CATALOG.find((entry) => entry.kind === kind);
        if (!id || ids.has(id))
          throw new Error(
            "The design contains a missing or duplicate object ID.",
          );
        if (!catalogItem)
          throw new Error(
            `The object type “${kind || "unknown"}” is not available.`,
          );
        ids.add(id);
        return {
          id,
          kind,
          name: catalogItem.name,
          category: catalogItem.category,
          x: number(element, "x", -100, 100),
          y: number(element, "y", 0, 20),
          z: number(element, "z", -100, 100),
          rot: number(element, "rotation", -1000, 1000),
          color: color(element, "color"),
          scale: number(element, "scale", 0.1, 5),
          supportId: element.getAttribute("support-id") || undefined,
        } satisfies ItemData;
      });
    for (const item of importedItems)
      if (item.supportId && !ids.has(item.supportId))
        item.supportId = undefined;
    return {
      name: this.cleanRoomName(root.getAttribute("name") ?? ""),
      width: number(room, "width", 10, 20),
      depth: number(room, "depth", 8, 16),
      shape,
      shapeWidth: number(room, "shape-width", 0, 1),
      crossbarDepth: number(room, "crossbar-depth", 0, 1),
      wallColor: color(room, "wall-color"),
      floorColor: color(room, "floor-color"),
      wallStyle: wallStyle as WallFinishStyle,
      floorStyle: floorStyle as FloorFinishStyle,
      evening: preferences?.getAttribute("time") === "evening",
      muted: preferences?.getAttribute("muted") === "true",
      items: importedItems,
    };
  }
  private async loadDesignXml(file: File) {
    this.setFileStatus(`Checking ${file.name}…`);
    try {
      const design = this.parseDesignXml(await file.text());
      this.roomName = design.name;
      this.roomWidth = design.width;
      this.roomDepth = design.depth;
      this.roomShape = design.shape;
      this.roomShapeWidth = design.shapeWidth;
      this.roomCrossbarDepth = design.crossbarDepth;
      this.roomWallColor = design.wallColor;
      this.roomFloorColor = design.floorColor;
      this.roomWallStyle = design.wallStyle;
      this.roomFloorStyle = design.floorStyle;
      this.muted = design.muted;
      this.evening = design.evening;
      this.rebuildRoom();
      this.data = design.items;
      this.rebuild();
      this.clampAllToRoom();
      this.history = [];
      this.future = [];
      this.select(undefined);
      this.syncRoomControls();
      this.syncRoomNameControl();
      this.syncSoundControl();
      this.applyTimeOfDay();
      this.saveRoomSettings();
      this.changed();
      this.resetCamera();
      this.setFileStatus(
        `Loaded ${file.name} with ${this.data.length} ${this.data.length === 1 ? "piece" : "pieces"}.`,
        "success",
      );
    } catch (error) {
      this.setFileStatus(
        error instanceof Error
          ? error.message
          : "The design could not be loaded.",
        "error",
      );
    }
  }
  private syncSoundControl() {
    const button = document.querySelector<HTMLButtonElement>("#sound");
    if (!button) return;
    button.textContent = this.muted ? "🔇" : "♪";
    const action = this.muted ? "Turn sound on" : "Mute sound";
    button.title = action;
    button.setAttribute("aria-label", action);
    button.setAttribute("aria-pressed", String(this.muted));
  }
  private toggleSound() {
    this.muted = !this.muted;
    if (this.muted) {
      this.ambience.pause();
    } else if (document.querySelector("#welcome")?.classList.contains("gone")) {
      this.ambience.loop = true;
      this.ambience.volume = 0.16;
      void this.ambience.play().catch(() => {});
    }
    this.syncSoundControl();
    this.saveRoomSettings();
    this.audio("chime");
  }
  private setRoomFinish(surface: "wall" | "floor", value: string) {
    const color = Number.parseInt(value.replace("#", ""), 16);
    if (!Number.isFinite(color)) return;
    if (surface === "wall") {
      this.roomWallColor = color;
    } else {
      this.roomFloorColor = color;
    }
    this.rebuildRoom();
    this.syncRoomControls();
    this.saveRoomSettings();
    this.changed();
  }
  private setRoomStyle(surface: "wall" | "floor", value: string) {
    if (surface === "wall") {
      if (!WALL_FINISH_STYLES.includes(value as WallFinishStyle)) return;
      this.roomWallStyle = value as WallFinishStyle;
    } else {
      if (!FLOOR_FINISH_STYLES.includes(value as FloorFinishStyle)) return;
      this.roomFloorStyle = value as FloorFinishStyle;
    }
    this.rebuildRoom();
    this.syncRoomControls();
    this.saveRoomSettings();
    this.changed();
    this.audio("place");
  }
  private setRoomSize(width: number, depth: number) {
    this.roomWidth = THREE.MathUtils.clamp(width, 10, 20);
    this.roomDepth = THREE.MathUtils.clamp(depth, 8, 16);
    this.clampAllToRoom();
    this.rebuildRoom();
    this.syncRoomControls();
    this.saveRoomSettings();
    this.changed();
  }
  private setRoomShape(shape: RoomShape) {
    if (
      !["rectangle", "l", "t", "u"].includes(shape) ||
      shape === this.roomShape
    )
      return;
    this.roomShape = shape;
    this.clampAllToRoom();
    this.rebuildRoom();
    this.syncRoomControls();
    this.saveRoomSettings();
    this.resetCamera();
    this.audio("place");
    this.changed();
  }
  private setRoomProportions(width: number, depth: number) {
    this.roomShapeWidth = THREE.MathUtils.clamp(width, 0, 1);
    this.roomCrossbarDepth = THREE.MathUtils.clamp(depth, 0, 1);
    this.clampAllToRoom();
    this.rebuildRoom();
    this.syncRoomControls();
    this.saveRoomSettings();
    this.changed();
  }
  private bindTouchExtras() {
    document
      .querySelector("#smaller")
      ?.addEventListener("click", () => this.resizeSelected(-0.1));
    document
      .querySelector("#larger")
      ?.addEventListener("click", () => this.resizeSelected(0.1));
    const distance = () => {
      const p = [...this.touches.values()];
      return p.length < 2
        ? 0
        : Math.hypot(p[0].clientX - p[1].clientX, p[0].clientY - p[1].clientY);
    };
    const beginTouchDrag = (event: PointerEvent, group: THREE.Group) => {
      this.select(group);
      this.checkpoint();
      this.drag = true;
      this.controls.enabled = false;
      const data = this.data.find((item) => item.id === group.userData.itemId);
      if (data) this.dragValid = true;
      this.doorFollowers = [];
      if (data && ARCHITECTURAL_KINDS.has(data.kind)) {
        const room = this.extensionRect(data);
        if (room)
          this.doorFollowers = this.data
            .filter(
              (item) =>
                item.id !== data.id &&
                item.x >= room.minX &&
                item.x <= room.maxX &&
                item.z >= room.minZ &&
                item.z <= room.maxZ,
            )
            .map((item) => item.id);
      }
      this.dragHeight = data?.supportId ? 0 : group.position.y;
      this.setPointer(event);
      this.ray.setFromCamera(this.pointer, this.camera);
      const hit = new THREE.Vector3();
      this.ray.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.dragHeight),
        hit,
      );
      this.dragOffset.copy(group.position).sub(hit);
      try {
        this.canvas.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic touch events do not always create a capturable pointer.
      }
    };
    this.canvas.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType !== "touch") return;
        if (this.firstPerson) return;
        if (this.placement) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.updatePlacementFromPointer(e);
          this.commitPlacement();
          return;
        }
        this.touches.set(e.pointerId, e);
        if (this.touches.size === 2) {
          this.pendingTouch = undefined;
          if (this.drag) this.pointerUp();
          this.pinchStart = distance();
          this.pinchCameraDistance = this.camera.position.distanceTo(
            this.controls.target,
          );
          this.controls.enabled = false;
          e.stopImmediatePropagation();
          return;
        }
        this.setPointer(e);
        this.ray.setFromCamera(this.pointer, this.camera);
        const hit = this.ray.intersectObjects([...this.items.values()], true)[0],
          group = hit ? this.ownerOf(hit.object) : undefined;
        if (group) {
          this.select(group);
          this.pendingTouch = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            group,
          };
          e.stopImmediatePropagation();
        }
      },
      true,
    );
    this.canvas.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType !== "touch") return;
        if (this.firstPerson) return;
        this.touches.set(e.pointerId, e);
        if (this.pinchStart && this.touches.size >= 2) {
          const currentDistance = Math.max(1, distance()),
            nextDistance = THREE.MathUtils.clamp(
              (this.pinchCameraDistance * this.pinchStart) / currentDistance,
              this.controls.minDistance,
              this.controls.maxDistance,
            ),
            direction = this.camera.position
              .clone()
              .sub(this.controls.target)
              .normalize();
          this.camera.position
            .copy(this.controls.target)
            .addScaledVector(direction, nextDistance);
          this.controls.update();
          e.stopImmediatePropagation();
        } else if (this.pendingTouch?.pointerId === e.pointerId) {
          const moved = Math.hypot(
            e.clientX - this.pendingTouch.startX,
            e.clientY - this.pendingTouch.startY,
          );
          if (moved >= 8) {
            const group = this.pendingTouch.group;
            this.pendingTouch = undefined;
            beginTouchDrag(e, group);
            this.pointerMove(e);
          }
          e.stopImmediatePropagation();
        } else if (this.drag) {
          this.pointerMove(e);
          e.stopImmediatePropagation();
        }
      },
      true,
    );
    const finish = (e: PointerEvent) => {
      if (this.firstPerson) return;
      this.touches.delete(e.pointerId);
      if (this.pinchStart) {
        if (this.touches.size < 2) {
          this.pinchStart = 0;
          this.pinchCameraDistance = 0;
          this.controls.enabled = true;
        }
      } else if (this.pendingTouch?.pointerId === e.pointerId) {
        this.pendingTouch = undefined;
        this.controls.enabled = true;
      } else this.pointerUp();
    };
    window.addEventListener("pointerup", finish, true);
    window.addEventListener("pointercancel", finish, true);
    this.canvas.addEventListener("lostpointercapture", finish);
    window.addEventListener("blur", () => {
      this.touches.clear();
      this.pinchStart = 0;
      this.pinchCameraDistance = 0;
      this.pendingTouch = undefined;
      this.pointerUp();
      this.controls.enabled = true;
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.touches.clear();
        this.pinchStart = 0;
        this.pinchCameraDistance = 0;
        this.pendingTouch = undefined;
        this.pointerUp();
        this.controls.enabled = true;
      }
    });
  }
  private renderCatalog(cat: CatalogFilter) {
    this.catalogCategory = cat;
    const host = document.querySelector<HTMLElement>("#items")!;
    host.innerHTML = "";
    const terms = this.catalogQuery.split(/\s+/).filter(Boolean);
    const matches = CATALOG.filter((x) => {
      const haystack =
        `${x.name} ${x.note} ${x.kind} ${x.category}`.toLowerCase();
      return (
        (cat === "all" ||
          (cat === "recent" && this.recentKinds.includes(x.kind)) ||
          (cat === "favorites" && this.favoriteKinds.has(x.kind)) ||
          x.category === cat) &&
        (this.catalogPlacement === "all" ||
          (x.placement ?? "floor") === this.catalogPlacement) &&
        (this.catalogSize === "all" ||
          this.catalogItemSize(x) === this.catalogSize) &&
        terms.every((term) => haystack.includes(term))
      );
    });
    if (cat === "recent" || this.catalogSort === "recent")
      matches.sort(
        (a, b) => {
          const aIndex = this.recentKinds.indexOf(a.kind),
            bIndex = this.recentKinds.indexOf(b.kind);
          return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) -
            (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex);
        },
      );
    else if (this.catalogSort === "name")
      matches.sort((a, b) => a.name.localeCompare(b.name));
    for (const x of matches) {
      const card = document.createElement("div"),
        b = document.createElement("button"),
        favorite = document.createElement("button"),
        preview = document.createElement("img"),
        icon = document.createElement("span"),
        note = document.createElement("small"),
        addLabel = document.createElement("em");
      card.className = "item-card";
      b.className = "item";
      b.setAttribute("aria-label", `${x.name}. ${x.note}`);
      b.setAttribute("aria-keyshortcuts", "F");
      preview.className = "item-preview";
      preview.alt = "";
      preview.setAttribute("aria-hidden", "true");
      icon.textContent = x.icon;
      icon.className = "item-icon-fallback";
      note.textContent = x.note;
      addLabel.textContent = "+ Preview & place";
      b.append(preview, icon, document.createTextNode(x.name), note, addLabel);
      this.observeCatalogThumbnail(x, preview, icon);
      b.onclick = () => {
        this.recentKinds = [x.kind, ...this.recentKinds.filter((kind) => kind !== x.kind)].slice(0, 12);
        localStorage.setItem("my-little-room-recent-v1", JSON.stringify(this.recentKinds));
        this.startPlacement(x);
      };
      favorite.className = "favorite-item";
      favorite.type = "button";
      favorite.tabIndex = -1;
      const syncFavorite = () => {
        const active = this.favoriteKinds.has(x.kind);
        favorite.textContent = active ? "★" : "☆";
        favorite.setAttribute("aria-pressed", String(active));
        favorite.setAttribute(
          "aria-label",
          `${active ? "Remove" : "Add"} ${x.name} ${active ? "from" : "to"} favorites`,
        );
      };
      const toggleFavorite = () => {
        if (this.favoriteKinds.has(x.kind)) this.favoriteKinds.delete(x.kind);
        else this.favoriteKinds.add(x.kind);
        localStorage.setItem(
          "my-little-room-favorites-v1",
          JSON.stringify([...this.favoriteKinds]),
        );
        syncFavorite();
        this.announce(
          `${x.name} ${this.favoriteKinds.has(x.kind) ? "added to" : "removed from"} favorites.`,
        );
        if (cat === "favorites" && !this.favoriteKinds.has(x.kind))
          this.renderCatalog(cat);
      };
      favorite.onclick = toggleFavorite;
      b.addEventListener("keydown", (event) => {
        if (event.key.toLowerCase() === "f") {
          event.preventDefault();
          toggleFavorite();
        }
      });
      syncFavorite();
      card.append(b, favorite);
      host.appendChild(card);
    }
    const itemButtons = [...host.querySelectorAll<HTMLButtonElement>(".item")];
    itemButtons.forEach((button, index) => (button.tabIndex = index ? -1 : 0));
    host.onkeydown = (event) => {
      const current = itemButtons.indexOf(document.activeElement as HTMLButtonElement);
      if (current < 0 || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const columns = Math.max(1, Math.round(host.clientWidth / Math.max(150, itemButtons[0].clientWidth)));
      const delta = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" ? -columns : event.key === "ArrowDown" ? columns : 0;
      const next = event.key === "Home" ? 0 : event.key === "End" ? itemButtons.length - 1 : THREE.MathUtils.clamp(current + delta, 0, itemButtons.length - 1);
      itemButtons[current].tabIndex = -1;
      itemButtons[next].tabIndex = 0;
      itemButtons[next].focus();
    };
    document.querySelector<HTMLElement>("#catalog-summary")!.textContent =
      `${matches.length} of ${CATALOG.length} pieces`;
    const empty = document.querySelector<HTMLElement>("#no-results")!;
    empty.hidden = matches.length > 0;
  }
  private catalogItemSize(item: CatalogItem): Exclude<CatalogSizeFilter, "all"> {
    const placement = item.placement ?? "floor";
    if (placement === "surface" || placement === "wall" || placement === "ceiling")
      return "small";
    if (
      item.category === "beds" ||
      /(wardrobe|cabinet|bookcase|shelf|sofa|sectional|desk|dresser|bed|door|window)/.test(
        `${item.kind} ${item.name}`.toLowerCase(),
      )
    )
      return "large";
    return "medium";
  }
  private observeCatalogThumbnail(
    catalog: CatalogItem,
    image: HTMLImageElement,
    fallback: HTMLElement,
  ) {
    const cached = this.catalogThumbnailCache.get(catalog.kind);
    if (cached) {
      image.src = cached;
      fallback.hidden = true;
      return;
    }
    image.dataset.catalogKind = catalog.kind;
    this.catalogThumbnailObserver ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLImageElement,
            kind = target.dataset.catalogKind,
            item = CATALOG.find((candidate) => candidate.kind === kind);
          this.catalogThumbnailObserver?.unobserve(target);
          if (!item) continue;
          const render = () => {
            if (!target.isConnected) return;
            const url = this.renderCatalogThumbnail(item);
            if (!url) return;
            this.catalogThumbnailCache.set(item.kind, url);
            target.src = url;
            const icon = target.nextElementSibling as HTMLElement | null;
            if (icon?.classList.contains("item-icon-fallback")) icon.hidden = true;
          };
          if (typeof window.requestIdleCallback === "function")
            window.requestIdleCallback(render, { timeout: 900 });
          else globalThis.setTimeout(render, 0);
        }
      },
      { root: document.querySelector("#catalog-add-view"), rootMargin: "180px" },
    );
    this.catalogThumbnailObserver.observe(image);
  }
  private renderCatalogThumbnail(catalog: CatalogItem) {
    try {
      this.catalogThumbnailRenderer ??= new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      const renderer = this.catalogThumbnailRenderer;
      renderer.setSize(176, 124, false);
      renderer.setPixelRatio(1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.setClearColor(0x000000, 0);
      const seed = [...catalog.kind].reduce((sum, character) => sum + character.charCodeAt(0), 0),
        data: ItemData = {
          id: `thumbnail-${catalog.kind}`,
          kind: catalog.kind,
          name: catalog.name,
          category: catalog.category,
          x: 0,
          y: catalog.defaultY ?? 0,
          z: 0,
          rot: 0,
          color: PALETTE[seed % PALETTE.length],
          scale: 1,
        },
        model = this.makeItem(data),
        scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera(32, 176 / 124, 0.01, 100),
        box = new THREE.Box3().setFromObject(model),
        center = box.getCenter(new THREE.Vector3()),
        size = box.getSize(new THREE.Vector3()),
        radius = Math.max(size.x, size.y, size.z, 0.5);
      model.position.sub(center);
      model.rotation.y = -0.5;
      scene.add(model);
      scene.add(new THREE.HemisphereLight(0xfff6df, 0x6f655b, 2.4));
      const key = new THREE.DirectionalLight(0xffe4bd, 3.2);
      key.position.set(3, 5, 4);
      scene.add(key);
      camera.position.set(radius * 2.15, radius * 1.55, radius * 2.7);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      const result = renderer.domElement.toDataURL("image/webp", 0.82);
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      });
      return result;
    } catch (error) {
      console.warn(`Could not render catalog preview for ${catalog.kind}`, error);
      return undefined;
    }
  }
  private announce(message: string) {
    const status = document.querySelector<HTMLElement>("#editor-status");
    if (!status) return;
    status.textContent = "";
    requestAnimationFrame(() => (status.textContent = message));
  }
  private objectLabel(data: ItemData) {
    const peers = this.data.filter((item) => item.name === data.name),
      index = peers.findIndex((item) => item.id === data.id);
    return peers.length > 1 ? `${data.name} ${index + 1}` : data.name;
  }
  private renderObjectManager() {
    const host = document.querySelector<HTMLElement>("#room-object-list"),
      count = document.querySelector<HTMLElement>("#room-object-count");
    if (!host || !count) return;
    host.replaceChildren();
    count.textContent = `${this.data.length} ${this.data.length === 1 ? "object" : "objects"}`;
    if (!this.data.length) {
      const empty = document.createElement("p");
      empty.className = "object-manager-empty";
      empty.textContent = "Your room is empty. Choose Add objects to begin.";
      host.append(empty);
      this.syncObjectManagerSelection();
      return;
    }
    for (const data of this.data) {
      const button = document.createElement("button");
      const label = this.objectLabel(data);
      button.className = "room-object";
      button.dataset.objectId = data.id;
      button.setAttribute("aria-pressed", String(data.id === this.selected?.userData.itemId));
      button.setAttribute(
        "aria-label",
        `${label}. Position ${data.x.toFixed(1)} across, ${data.z.toFixed(1)} deep, height ${(data.y ?? 0).toFixed(1)}.`,
      );
      button.setAttribute(
        "aria-keyshortcuts",
        "ArrowLeft ArrowRight ArrowUp ArrowDown Shift+ArrowLeft Shift+ArrowRight Shift+ArrowUp Shift+ArrowDown",
      );
      const name = document.createElement("strong"),
        position = document.createElement("small");
      name.textContent = label;
      position.textContent = `${data.x.toFixed(1)} across · ${data.z.toFixed(1)} deep`;
      button.append(name, position);
      button.onclick = () => {
        this.select(this.items.get(data.id));
        this.announce(`${label} selected.`);
      };
      button.onkeydown = (event) => {
        const step = event.shiftKey ? 0.5 : 0.1;
        const moves: Record<string, [number, number]> = {
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
        };
        const move = moves[event.key];
        if (!move) return;
        event.preventDefault();
        this.select(this.items.get(data.id));
        this.nudgeSelected(move[0], move[1]);
        const updated = this.findData();
        if (updated) {
          position.textContent = `${updated.x.toFixed(1)} across · ${updated.z.toFixed(1)} deep`;
          button.setAttribute(
            "aria-label",
            `${label}. Position ${updated.x.toFixed(1)} across, ${updated.z.toFixed(1)} deep, height ${(updated.y ?? 0).toFixed(1)}.`,
          );
        }
      };
      host.append(button);
    }
    this.syncObjectManagerSelection();
    this.syncTransformReadout();
  }
  private syncObjectManagerSelection() {
    const data = this.findData(),
      controls = document.querySelector<HTMLElement>("#object-manager-controls"),
      name = document.querySelector<HTMLElement>("#object-manager-selected");
    document
      .querySelectorAll<HTMLButtonElement>(".room-object")
      .forEach((button) => {
        const selected = button.dataset.objectId === data?.id;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
    if (!controls || !name) return;
    controls.hidden = !data;
    controls.inert = !data;
    if (data)
      name.textContent = `${this.objectLabel(data)} · ${data.x.toFixed(1)} across · ${data.z.toFixed(1)} deep`;
  }
  private nudgeSelected(dx: number, dz: number) {
    const data = this.findData();
    if (!data || !this.selected) return;
    const oldX = data.x,
      oldZ = data.z;
    this.checkpoint();
    data.x += dx;
    data.z += dz;
    if (this.gridSnap) {
      data.x = Math.round(data.x * 2) / 2;
      data.z = Math.round(data.z * 2) / 2;
    }
    this.selected.position.set(data.x, data.y ?? 0, data.z);
    this.keepSelectedInRoom();
    const ignored = new Set<string>();
    if (data.supportId) ignored.add(data.supportId);
    if (this.objectCollision(this.selected, data, ignored)) {
      data.x = oldX;
      data.z = oldZ;
      this.selected.position.set(oldX, data.y ?? 0, oldZ);
      this.history.pop();
      this.updateButtons();
      this.setDragFeedback(false);
      window.setTimeout(() => this.setDragFeedback(true, true), 280);
      this.announce(`${this.objectLabel(data)} cannot move there because another object is in the way.`);
      return;
    }
    this.changed();
    this.syncObjectManagerSelection();
    this.announce(
      `${this.objectLabel(data)} moved to ${data.x.toFixed(1)} across, ${data.z.toFixed(1)} deep.`,
    );
  }
  private alignSelectedToWall() {
    const data = this.findData();
    if (!data || !this.selected) return;
    const group = this.selected,
      old = { x: data.x, z: data.z, rot: data.rot },
      inset = 0.2,
      candidates: Array<{ x: number; z: number; rot: number; distance: number }> = [];
    for (const rect of this.roomRects(true)) {
      for (const side of ["back", "front", "left", "right"] as const) {
        const rot = side === "left" || side === "right" ? Math.PI / 2 : 0;
        group.rotation.y = rot;
        const size = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3()),
          halfX = size.x / 2,
          halfZ = size.z / 2;
        let x = THREE.MathUtils.clamp(data.x, rect.minX + halfX, rect.maxX - halfX),
          z = THREE.MathUtils.clamp(data.z, rect.minZ + halfZ, rect.maxZ - halfZ);
        if (side === "back") z = rect.minZ + halfZ + inset;
        if (side === "front") z = rect.maxZ - halfZ - inset;
        if (side === "left") x = rect.minX + halfX + inset;
        if (side === "right") x = rect.maxX - halfX - inset;
        if (
          x >= rect.minX + halfX &&
          x <= rect.maxX - halfX &&
          z >= rect.minZ + halfZ &&
          z <= rect.maxZ - halfZ
        )
          candidates.push({
            x,
            z,
            rot,
            distance: (x - data.x) ** 2 + (z - data.z) ** 2,
          });
      }
    }
    group.rotation.y = old.rot;
    const target = candidates.sort((a, b) => a.distance - b.distance)[0];
    if (!target) {
      this.announce(`${this.objectLabel(data)} cannot fit against a wall.`);
      return;
    }
    this.checkpoint();
    data.x = target.x;
    data.z = target.z;
    data.rot = target.rot;
    group.position.set(data.x, data.y ?? 0, data.z);
    group.rotation.y = data.rot;
    const ignored = new Set<string>();
    if (data.supportId) ignored.add(data.supportId);
    if (this.objectCollision(group, data, ignored)) {
      data.x = old.x;
      data.z = old.z;
      data.rot = old.rot;
      group.position.set(data.x, data.y ?? 0, data.z);
      group.rotation.y = data.rot;
      this.history.pop();
      this.updateButtons();
      this.setDragFeedback(false);
      window.setTimeout(() => this.setDragFeedback(true, true), 280);
      this.announce(`${this.objectLabel(data)} cannot align there because another object is in the way.`);
      return;
    }
    this.changed();
    this.syncObjectManagerSelection();
    this.syncTransformReadout();
    this.announce(`${this.objectLabel(data)} aligned to the nearest wall.`);
  }
  private runObjectManagerAction(action: string) {
    if (action === "undo") {
      this.undo();
      this.announce("Last object change undone.");
      return;
    }
    const before = this.findData();
    if (!before) return;
    const name = this.objectLabel(before);
    switch (action) {
      case "left":
        this.nudgeSelected(-0.1, 0);
        return;
      case "right":
        this.nudgeSelected(0.1, 0);
        return;
      case "forward":
        this.nudgeSelected(0, -0.1);
        return;
      case "back":
        this.nudgeSelected(0, 0.1);
        return;
      case "rotate-left":
        this.modify(-Math.PI / 12);
        break;
      case "rotate-right":
        this.modify(Math.PI / 12);
        break;
      case "lower":
        this.adjustHeight(-0.2);
        break;
      case "raise":
        this.adjustHeight(0.2);
        break;
      case "smaller":
        this.resizeSelected(-0.1);
        break;
      case "larger":
        this.resizeSelected(0.1);
        break;
      case "color":
        this.recolor();
        break;
      case "duplicate":
        this.duplicate();
        this.announce(`${name} duplicated.`);
        return;
      case "align-wall":
        this.alignSelectedToWall();
        return;
      case "remove":
        this.remove();
        this.announce(`${name} removed. Undo is available.`);
        return;
      default:
        return;
    }
    const updated = this.findData();
    if (updated) {
      this.syncObjectManagerSelection();
      this.announce(`${name} updated.`);
    }
  }
  private startPlacement(catalog: CatalogItem) {
    this.cancelPlacement(false);
    this.surfaces.close("catalog", false);
    this.surfaces.close("room-panel", false);
    this.surfaces.close("file-panel", false);
    if (this.compactToolsQuery.matches)
      this.surfaces.close("secondary-actions", false);
    this.select(undefined);
    const defaultColors: Record<string, number> = {
        billy: 0xeeeae0,
        paxdrawers: 0xeeeae0,
        memoryrug: 0xffffff,
        window: 0xc98270,
        wallframes: 0x6f4935,
        wallshelf: 0x6f4935,
      },
      data: ItemData = {
        id: `preview-${crypto.randomUUID()}`,
        kind: catalog.kind,
        name: catalog.name,
        category: catalog.category,
        x: 0,
        y: catalog.defaultY ?? 0,
        z: 0,
        rot: 0,
        color:
          defaultColors[catalog.kind] ??
          PALETTE[Math.floor(Math.random() * PALETTE.length)],
        scale: 1,
      },
      group = this.makeItem(data),
      marker = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.72, 36),
        new THREE.MeshBasicMaterial({
          color: 0x4f9b65,
          transparent: true,
          opacity: 0.9,
          depthTest: false,
          side: THREE.DoubleSide,
        }),
      );
    group.name = `${catalog.name} placement preview`;
    group.userData.placementPreview = true;
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      const clones = materials.map((material) => {
        const clone = material.clone();
        clone.transparent = true;
        clone.opacity = Math.min(clone.opacity, 0.68);
        clone.depthWrite = false;
        clone.depthTest = false;
        return clone;
      });
      object.material = Array.isArray(object.material) ? clones : clones[0];
      object.renderOrder = 999;
    });
    if (ARCHITECTURAL_KINDS.has(data.kind)) {
      this.snapDoorToWall(data, this.findClearBackWallPosition(1), 0);
      group.position.set(data.x, 0, data.z);
      group.rotation.y = data.rot;
    } else if (catalog.placement === "wall") {
      this.positionAgainstNearestWall(data, group, 0, -this.roomDepth / 2);
    } else if (catalog.placement === "surface") {
      const support = [...this.items.values()].find((item) => {
        const supportData = this.data.find((entry) => entry.id === item.userData.itemId);
        return Boolean(supportData && SUPPORT_KINDS.has(supportData.kind));
      });
      if (support) {
        data.x = support.position.x;
        data.z = support.position.z;
        data.y = this.supportTop(support) + 0.025;
        data.supportId = support.userData.itemId;
        group.position.set(data.x, data.y, data.z);
      } else {
        const spot = this.findOpenFloorSpot(group);
        data.x = spot.x;
        data.z = spot.z;
        group.position.set(data.x, data.y ?? 0, data.z);
      }
    } else {
      const spot = this.findOpenFloorSpot(group);
      data.x = spot.x;
      data.z = spot.z;
      group.position.set(data.x, data.y ?? 0, data.z);
    }
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(data.x, 0.025, data.z);
    marker.renderOrder = 1000;
    this.scene.add(group, marker);
    this.placement = { catalog, data, group, marker, valid: true };
    document.querySelector("#placement-name")!.textContent = `Place ${catalog.name}`;
    this.surfaces.setPersistent("placement-toolbar", true);
    document.body.classList.add("placing-object");
    this.refreshPlacementValidity();
    document.querySelector<HTMLButtonElement>("#placement-confirm")?.focus();
    this.announce(
      `${catalog.name} preview ready. Move over the floor and choose Place here, or press Enter.`,
    );
  }
  private objectCollision(
    group: THREE.Group,
    data: ItemData,
    ignoredIds = new Set<string>(),
  ) {
    if (["memoryrug", "roundrug"].includes(data.kind)) return false;
    const candidate = new THREE.Box3().setFromObject(group).expandByScalar(-0.06);
    for (const [id, other] of this.items) {
      if (id === data.id || ignoredIds.has(id)) continue;
      const otherData = this.data.find((item) => item.id === id),
        otherCatalog = otherData
          ? CATALOG.find((item) => item.kind === otherData.kind)
          : undefined;
      if (
        !otherData ||
        ["memoryrug", "roundrug"].includes(otherData.kind) ||
        otherCatalog?.placement === "wall" ||
        otherCatalog?.placement === "ceiling"
      )
        continue;
      const otherBox = new THREE.Box3().setFromObject(other).expandByScalar(-0.06);
      if (candidate.intersectsBox(otherBox)) return true;
    }
    return false;
  }
  private refreshPlacementValidity() {
    if (!this.placement) return;
    const { data, group, marker } = this.placement,
      ignored = new Set<string>(data.supportId ? [data.supportId] : []),
      collision = this.objectCollision(group, data, ignored),
      inside = Boolean(this.placementPoint(group, data.x, data.z)),
      needsSupport = this.placement.catalog.placement === "surface",
      valid = inside && !collision && (!needsSupport || Boolean(data.supportId)),
      color = valid ? 0x3e9b5f : 0xc14d43;
    this.placement.valid = valid;
    marker.material.color.setHex(color);
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials)
        if (material instanceof THREE.MeshStandardMaterial) {
          material.emissive.setHex(color);
          material.emissiveIntensity = valid ? 0.13 : 0.3;
        }
    });
    const status = document.querySelector<HTMLElement>("#placement-status")!,
      confirm = document.querySelector<HTMLButtonElement>("#placement-confirm")!;
    status.textContent = valid
      ? "Valid position — place here."
      : needsSupport && !data.supportId
        ? "Place this object on a table, desk, shelf, or cabinet."
        : collision
        ? "This overlaps another object. Choose a clear position."
        : "This object must stay inside the room.";
    status.dataset.valid = String(valid);
    confirm.disabled = !valid;
  }
  private updatePlacementFromPointer(event: PointerEvent) {
    if (!this.placement) return;
    this.setPointer(event);
    this.ray.setFromCamera(this.pointer, this.camera);
    const hit = new THREE.Vector3();
    if (
      !this.ray.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 1, 0)),
        hit,
      )
    )
      return;
    const { data, group, marker } = this.placement;
    if (ARCHITECTURAL_KINDS.has(data.kind)) {
      this.snapDoorToWall(data, hit.x, hit.z);
      group.position.set(data.x, 0, data.z);
      group.rotation.y = data.rot;
    } else if (this.placement.catalog.placement === "wall") {
      this.positionAgainstNearestWall(data, group, hit.x, hit.z);
    } else if (this.placement.catalog.placement === "surface") {
      const supportIntersection = this.ray
        .intersectObjects([...this.items.values()], true)
        .find((candidate) => {
          const owner = this.ownerOf(candidate.object);
          const supportData = this.data.find(
            (entry) => entry.id === owner?.userData.itemId,
          );
          return Boolean(owner && supportData && SUPPORT_KINDS.has(supportData.kind));
        });
      const supportHit = supportIntersection
        ? this.ownerOf(supportIntersection.object)
        : undefined;
      if (supportHit) {
        data.x = supportIntersection!.point.x;
        data.z = supportIntersection!.point.z;
        data.y = this.supportTop(supportHit) + 0.025;
        data.supportId = supportHit.userData.itemId;
        group.position.set(data.x, data.y, data.z);
      } else {
        data.supportId = undefined;
        data.x = hit.x;
        data.z = hit.z;
        group.position.set(data.x, data.y ?? 0, data.z);
      }
    } else {
      const x = this.gridSnap ? Math.round(hit.x * 2) / 2 : hit.x,
        z = this.gridSnap ? Math.round(hit.z * 2) / 2 : hit.z,
        position = this.clampToRoom(group, x, z);
      data.x = position.x;
      data.z = position.z;
      group.position.set(data.x, data.y ?? 0, data.z);
    }
    marker.position.set(data.x, 0.025, data.z);
    this.refreshPlacementValidity();
  }
  private positionAgainstNearestWall(
    data: ItemData,
    group: THREE.Group,
    x: number,
    z: number,
  ) {
    const rect = this.roomRects(true).sort((a, b) => {
        const distance = (r: RoomRect) => {
          const px = THREE.MathUtils.clamp(x, r.minX, r.maxX),
            pz = THREE.MathUtils.clamp(z, r.minZ, r.maxZ);
          return (px - x) ** 2 + (pz - z) ** 2;
        };
        return distance(a) - distance(b);
      })[0],
      distances = [
        { side: "back" as const, value: Math.abs(z - rect.minZ) },
        { side: "front" as const, value: Math.abs(z - rect.maxZ) },
        { side: "left" as const, value: Math.abs(x - rect.minX) },
        { side: "right" as const, value: Math.abs(x - rect.maxX) },
      ],
      side = distances.sort((a, b) => a.value - b.value)[0].side;
    data.rot = side === "left" || side === "right" ? Math.PI / 2 : 0;
    group.rotation.y = data.rot;
    const size = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3()),
      halfX = size.x / 2,
      halfZ = size.z / 2;
    data.x = THREE.MathUtils.clamp(x, rect.minX + halfX, rect.maxX - halfX);
    data.z = THREE.MathUtils.clamp(z, rect.minZ + halfZ, rect.maxZ - halfZ);
    if (side === "back") data.z = rect.minZ + halfZ + 0.03;
    if (side === "front") data.z = rect.maxZ - halfZ - 0.03;
    if (side === "left") data.x = rect.minX + halfX + 0.03;
    if (side === "right") data.x = rect.maxX - halfX - 0.03;
    group.position.set(data.x, data.y ?? 0, data.z);
  }
  private disposePlacementPreview() {
    if (!this.placement) return;
    const { group, marker } = this.placement;
    this.scene.remove(group, marker);
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => material.dispose());
    });
    marker.geometry.dispose();
    marker.material.dispose();
  }
  private commitPlacement() {
    if (!this.placement) return;
    if (!this.placement.valid) {
      this.announce("Choose a clear position before placing this object.");
      return;
    }
    const { catalog, data } = this.placement,
      placed = { ...data, id: crypto.randomUUID() };
    this.disposePlacementPreview();
    this.placement = undefined;
    this.surfaces.setPersistent("placement-toolbar", false);
    document.body.classList.remove("placing-object");
    this.add(catalog, placed, true);
    this.canvas.focus({ preventScroll: true });
    localStorage.setItem("my-little-room-placement-hint-v1", "complete");
    this.announce(`${catalog.name} placed and selected. Undo is available.`);
  }
  private cancelPlacement(reopenCatalog = true) {
    if (!this.placement) return;
    const name = this.placement.catalog.name;
    this.disposePlacementPreview();
    this.placement = undefined;
    this.surfaces.setPersistent("placement-toolbar", false);
    document.body.classList.remove("placing-object");
    if (reopenCatalog) this.surfaces.open("catalog", document.querySelector("#catalog-add-tab")!);
    this.announce(`${name} placement cancelled.`);
  }
  private add(c: CatalogItem, d?: Partial<ItemData>, record = true) {
    if (record) this.checkpoint();
    const defaultColors: Record<string, number> = {
      billy: 0xeeeae0,
      paxdrawers: 0xeeeae0,
      memoryrug: 0xffffff,
      window: 0xc98270,
      wallframes: 0x6f4935,
      wallshelf: 0x6f4935,
    };
    const data: ItemData = {
      id: d?.id || crypto.randomUUID(),
      kind: c.kind,
      name: c.name,
      category: c.category,
      x: d?.x ?? 0,
      y: d?.y ?? c.defaultY ?? 0,
      z: d?.z ?? 1,
      rot: d?.rot || 0,
      color:
        d?.color ??
        defaultColors[c.kind] ??
        PALETTE[Math.floor(Math.random() * PALETTE.length)],
      scale: d?.scale ?? 1,
      supportId: d?.supportId,
    };
    const g = this.makeItem(data);
    if (ARCHITECTURAL_KINDS.has(data.kind)) {
      if (
        data.kind === "balconydoor" &&
        d?.x === undefined &&
        d?.z === undefined
      ) {
        data.rot = Math.PI / 2;
        this.snapDoorToWall(
          data,
          data.x,
          this.findClearLeftWallPosition(data.scale),
        );
      } else {
        const targetX =
          d?.x === undefined && d?.z === undefined
            ? this.findClearBackWallPosition(data.scale)
            : data.x;
        this.snapDoorToWall(data, targetX, data.z);
      }
      g.position.set(data.x, 0, data.z);
      g.rotation.y = data.rot;
    } else if (d?.x === undefined && d?.z === undefined) {
      const spot = this.findOpenFloorSpot(g);
      data.x = spot.x;
      data.z = spot.z;
      g.position.set(data.x, data.y ?? 0, data.z);
    }
    this.data.push(data);
    this.items.set(data.id, g);
    this.scene.add(g);
    if (ARCHITECTURAL_KINDS.has(data.kind)) {
      this.rebuildRoom();
      this.resetCamera();
    }
    this.select(g);
    this.renderObjectManager();
    if (record) {
      this.audio("place");
      this.changed();
      this.announce(`${this.objectLabel(data)} added and selected.`);
    }
    return g;
  }
  private roomLimitsFor(g: THREE.Group) {
    const size = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()),
      halfX = Math.max(0.05, size.x / 2),
      halfZ = Math.max(0.05, size.z / 2),
      edgeInset = WALL_FLUSH_KINDS.has(g.userData.kind) ? 0.02 : 0.2;
    const minX = -this.roomWidth / 2 + edgeInset + halfX,
      maxX = this.roomWidth / 2 - 0.08 - halfX,
      minZ = -this.roomDepth / 2 + edgeInset + halfZ,
      maxZ = this.roomDepth / 2 - 0.08 - halfZ;
    return {
      halfX,
      halfZ,
      minX: minX > maxX ? 0 : minX,
      maxX: minX > maxX ? 0 : maxX,
      minZ: minZ > maxZ ? 0 : minZ,
      maxZ: minZ > maxZ ? 0 : maxZ,
    };
  }
  private placementPoint(g: THREE.Group, x: number, z: number) {
    const { halfX, halfZ } = this.roomLimitsFor(g),
      edgeInset = WALL_FLUSH_KINDS.has(g.userData.kind) ? 0.02 : 0.2;
    let best: { x: number; z: number; distance: number } | undefined;
    for (const rect of this.roomRects(true)) {
      const minX = rect.minX + edgeInset + halfX,
        maxX = rect.maxX - 0.08 - halfX,
        minZ = rect.minZ + edgeInset + halfZ,
        maxZ = rect.maxZ - 0.08 - halfZ;
      if (minX > maxX || minZ > maxZ) continue;
      const px = THREE.MathUtils.clamp(x, minX, maxX),
        pz = THREE.MathUtils.clamp(z, minZ, maxZ),
        distance = (px - x) ** 2 + (pz - z) ** 2;
      if (!best || distance < best.distance) best = { x: px, z: pz, distance };
    }
    return best;
  }
  private clampToRoom(g: THREE.Group, x: number, z: number) {
    const best = this.placementPoint(g, x, z);
    if (best) return { x: best.x, z: best.z };
    const l = this.roomLimitsFor(g);
    return {
      x: THREE.MathUtils.clamp(x, l.minX, l.maxX),
      z: THREE.MathUtils.clamp(z, l.minZ, l.maxZ),
    };
  }
  private clampAllToRoom() {
    for (const d of this.data.filter((item) => !item.supportId)) {
      const g = this.items.get(d.id);
      if (!g) continue;
      if (ARCHITECTURAL_KINDS.has(d.kind)) {
        this.snapDoorToWall(d, d.x, d.z);
        g.position.set(d.x, 0, d.z);
        g.rotation.y = d.rot;
        this.syncArchitecturalExtension(d);
        continue;
      }
      if (!this.placementPoint(g, d.x, d.z)) {
        const size = new THREE.Box3()
          .setFromObject(g)
          .getSize(new THREE.Vector3());
        let fit = 0.55 / (d.scale ?? 1);
        for (const rect of this.roomRects(true))
          fit = Math.max(
            fit,
            Math.min(
              (rect.maxX - rect.minX - 0.28) / size.x,
              (rect.maxZ - rect.minZ - 0.28) / size.z,
            ),
          );
        const nextScale = THREE.MathUtils.clamp(
          (d.scale ?? 1) * fit * 0.98,
          0.55,
          d.scale ?? 1,
        );
        d.scale = nextScale;
        g.scale.setScalar(nextScale);
      }
      const oldX = d.x,
        oldZ = d.z,
        p = this.clampToRoom(g, d.x, d.z),
        dx = p.x - oldX,
        dz = p.z - oldZ;
      d.x = p.x;
      d.z = p.z;
      g.position.set(d.x, d.y ?? 0, d.z);
      if (SUPPORT_KINDS.has(d.kind))
        for (const child of this.data.filter(
          (item) => item.supportId === d.id,
        )) {
          child.x += dx;
          child.z += dz;
          this.items
            .get(child.id)
            ?.position.set(child.x, child.y ?? 0, child.z);
        }
    }
  }
  private findOpenFloorSpot(g: THREE.Group) {
    const { halfX, halfZ } = this.roomLimitsFor(g),
      padding = 0.28;
    const occupied = [...this.items.values()].map((item) =>
      new THREE.Box3().setFromObject(item),
    );
    const candidates: THREE.Vector2[] = [];
    for (let ring = 0; ring < 9; ring++) {
      const radius = ring * 1.25;
      const count = ring === 0 ? 1 : ring * 10;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 4 + (i * Math.PI * 2) / count;
        candidates.push(
          new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius),
        );
      }
    }
    const start = this.clampToRoom(g, 0, 0);
    let best = new THREE.Vector2(start.x, start.z),
      bestOverlap = Infinity;
    for (const candidate of candidates) {
      const clamped = this.clampToRoom(g, candidate.x, candidate.y),
        p = new THREE.Vector2(clamped.x, clamped.z);
      let overlap = 0;
      for (const box of occupied) {
        const dx =
          Math.min(p.x + halfX + padding, box.max.x) -
          Math.max(p.x - halfX - padding, box.min.x);
        const dz =
          Math.min(p.y + halfZ + padding, box.max.z) -
          Math.max(p.y - halfZ - padding, box.min.z);
        if (dx > 0 && dz > 0) overlap += dx * dz;
      }
      if (overlap === 0) return { x: p.x, z: p.y };
      if (overlap < bestOverlap) {
        bestOverlap = overlap;
        best.copy(p);
      }
    }
    return { x: best.x, z: best.y };
  }
  private makeItem(d: ItemData) {
    const g = new THREE.Group();
    g.userData.itemId = d.id;
    g.userData.kind = d.kind;
    g.name = d.name;
    const mat = new THREE.MeshStandardMaterial({
      color: d.color,
      roughness: 0.72,
    });
    const cream = new THREE.MeshStandardMaterial({
      color: 0xf1dfc1,
      roughness: 0.9,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x5a392b,
      roughness: 0.58,
    });
    const add = (
      geo: THREE.BufferGeometry,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
      rx = 0,
      ry = 0,
      rz = 0,
    ) => {
      const o = new THREE.Mesh(geo, m);
      o.position.set(x, y, z);
      o.rotation.set(rx, ry, rz);
      o.castShadow = true;
      o.receiveShadow = true;
      g.add(o);
      return o;
    };
    if (buildArchitecturalDoor(g, d.kind, d.color)) {
      // Door models are paired with generated spaces outside the selectable group.
    } else if (buildRealRoomProp(g, d.kind, d.color)) {
      // Photo-specific props from the user's real room references.
    } else if (buildExpandedProp(g, d.kind, d.color)) {
      // Expanded props are authored in the shared procedural factory.
    } else if (d.kind === "bed") {
      add(new THREE.BoxGeometry(3, 0.55, 4), dark, 0, 0.45, 0);
      add(new THREE.BoxGeometry(2.8, 0.45, 3.65), cream, 0, 0.95, 0.08);
      add(new THREE.BoxGeometry(2.72, 0.08, 2.28), mat, 0, 1.22, 0.66);
      add(new THREE.BoxGeometry(1.12, 0.22, 0.62), cream, -0.62, 1.34, -1.08);
      add(new THREE.BoxGeometry(1.12, 0.22, 0.62), cream, 0.62, 1.34, -1.08);
    } else if (d.kind === "desk") {
      add(new THREE.BoxGeometry(2.8, 0.22, 1.4), mat, 0, 1.75, 0);
      for (const x of [-1.15, 1.15])
        for (const z of [-0.5, 0.5])
          add(
            new THREE.CylinderGeometry(0.11, 0.14, 1.65, 8),
            dark,
            x,
            0.85,
            z,
          );
      add(
        new THREE.BoxGeometry(1.2, 0.1, 0.85),
        cream,
        -0.35,
        1.92,
        0,
        0.0,
        0,
        -0.08,
      );
    } else if (d.kind === "birchtable") {
      const birch = new THREE.MeshStandardMaterial({
        color: 0xe8c99c,
        roughness: 0.68,
        metalness: 0,
      });
      const grain = new THREE.MeshBasicMaterial({
        color: 0xcda97b,
        transparent: true,
        opacity: 0.18,
      });
      add(new RoundedBoxGeometry(3.8, 0.18, 2.2, 4, 0.12), birch, 0, 1.86, 0);
      add(new THREE.BoxGeometry(3.35, 0.25, 0.12), birch, 0, 1.68, 0.88);
      add(new THREE.BoxGeometry(3.35, 0.25, 0.12), birch, 0, 1.68, -0.88);
      add(new THREE.BoxGeometry(0.12, 0.25, 1.65), birch, 1.62, 1.68, 0);
      add(new THREE.BoxGeometry(0.12, 0.25, 1.65), birch, -1.62, 1.68, 0);
      for (const x of [-1.58, 1.58])
        for (const z of [-0.74, 0.74])
          add(
            new THREE.CylinderGeometry(0.11, 0.16, 1.72, 8),
            birch,
            x,
            0.86,
            z,
            -Math.sign(z) * 0.085,
            0,
            Math.sign(x) * 0.085,
          );
      for (let i = 0; i < 7; i++) {
        const line = add(
          new THREE.BoxGeometry(
            3.1 - (i % 2) * 0.35,
            0.008,
            0.01 + (i % 3) * 0.004,
          ),
          grain,
          ((i % 2) - 0.5) * 0.18,
          1.956,
          -0.73 + i * 0.23,
        );
        line.rotation.y = ((i % 3) - 1) * 0.009;
      }
    } else if (d.kind === "chair") {
      add(new RoundedBoxGeometry(1.4, 0.25, 1.4, 3, 0.045), mat, 0, 1.05, 0);
      const chairBackGeo = new RoundedBoxGeometry(1.4, 1.72, 0.22, 3, 0.045);
      chairBackGeo.translate(0, 0.86, 0);
      const chairBack = add(chairBackGeo, mat, 0, 1.08, 0.58, 0.14);
      chairBack.userData.pivot = "seat-back-base";
      for (const x of [-0.5, 0.5])
        for (const z of [-0.5, 0.5])
          add(new THREE.CylinderGeometry(0.1, 0.13, 1, 8), dark, x, 0.5, z);
    } else if (d.kind === "shelf") {
      for (let i = 0; i < 3; i++)
        add(new THREE.BoxGeometry(2.5, 0.18, 0.8), mat, 0, 0.45 + i * 0.8, 0);
      for (const x of [-1.1, 1.1])
        add(new THREE.BoxGeometry(0.18, 2.2, 0.8), dark, x, 1.25, 0);
    } else if (d.kind === "lamp") {
      add(new THREE.CylinderGeometry(0.5, 0.65, 0.18, 20), dark, 0, 0.1, 0);
      add(new THREE.CylinderGeometry(0.07, 0.09, 1.8, 10), dark, 0, 1, 0);
      add(
        new THREE.CylinderGeometry(0.34, 0.72, 0.7, 20, 1, true),
        mat,
        0,
        2,
        0,
      );
      const bulb = add(
        new THREE.SphereGeometry(0.18, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xffd285 }),
        0,
        1.88,
        0,
      );
      bulb.userData.glow = true;
    } else if (d.kind === "fairy") {
      for (let i = 0; i < 9; i++) {
        const x = -1.8 + i * 0.45,
          y = 1.5 + Math.sin(i * 0.8) * 0.25;
        add(
          new THREE.SphereGeometry(0.08, 10, 8),
          new THREE.MeshBasicMaterial({
            color: PALETTE[i % PALETTE.length],
            toneMapped: false,
          }),
          x,
          y,
          0,
        );
      }
    } else if (d.kind === "teddy") {
      add(new THREE.SphereGeometry(0.55, 18, 14), mat, 0, 0.7, 0);
      add(new THREE.SphereGeometry(0.42, 18, 14), mat, 0, 1.45, 0);
      for (const x of [-0.34, 0.34])
        add(new THREE.SphereGeometry(0.18, 14, 10), mat, x, 1.75, 0);
      for (const x of [-0.25, 0.25])
        add(new THREE.SphereGeometry(0.045, 8, 6), dark, x, 1.52, 0.38);
    } else if (d.kind === "radio") {
      add(new THREE.BoxGeometry(1.5, 0.9, 0.55), mat, 0, 0.55, 0);
      add(new THREE.CircleGeometry(0.28, 20), dark, -0.32, 0.58, 0.281);
      add(
        new THREE.CylinderGeometry(0.08, 0.08, 0.25, 10),
        cream,
        0.45,
        0.72,
        0.32,
        Math.PI / 2,
      );
      add(
        new THREE.CylinderGeometry(0.08, 0.08, 0.25, 10),
        cream,
        0.45,
        0.42,
        0.32,
        Math.PI / 2,
      );
    } else if (d.kind === "train") {
      add(new THREE.BoxGeometry(1.5, 0.5, 0.65), mat, 0, 0.48, 0);
      add(new THREE.BoxGeometry(0.55, 0.65, 0.55), dark, 0.35, 0.9, 0);
      add(
        new THREE.CylinderGeometry(0.12, 0.16, 0.65, 10),
        dark,
        -0.35,
        1.05,
        0,
      );
      for (const x of [-0.45, 0.45])
        for (const z of [-0.37, 0.37])
          add(
            new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12),
            dark,
            x,
            0.25,
            z,
            Math.PI / 2,
          );
    } else if (d.kind === "books") {
      for (let i = 0; i < 4; i++)
        add(
          new THREE.BoxGeometry(1.25, 0.18, 0.8),
          new THREE.MeshStandardMaterial({
            color: PALETTE[(i + 2) % PALETTE.length],
            roughness: 0.85,
          }),
          0,
          0.12 + i * 0.2,
          0,
          0,
          (i - 1.5) * 0.05,
          (i - 1.5) * 0.03,
        );
    } else if (d.kind === "canopy") {
      add(new THREE.BoxGeometry(3, 0.5, 4), dark, 0, 0.4, 0);
      add(new THREE.BoxGeometry(2.8, 0.42, 3.7), cream, 0, 0.85, 0);
      for (const x of [-1.35, 1.35])
        for (const z of [-1.8, 1.8])
          add(new THREE.CylinderGeometry(0.05, 0.07, 3.3, 8), dark, x, 1.9, z);
      add(new THREE.BoxGeometry(2.8, 0.12, 3.8), mat, 0, 3.5, 0);
    } else if (d.kind === "sofa") {
      add(new THREE.BoxGeometry(3, 0.55, 1.5), dark, 0, 0.45, 0);
      add(new THREE.BoxGeometry(2.7, 0.5, 1.25), mat, 0, 0.9, 0);
      add(new THREE.BoxGeometry(2.8, 1.35, 0.4), mat, 0, 1.5, 0.55);
      for (const x of [-1.35, 1.35])
        add(new THREE.BoxGeometry(0.35, 0.8, 1.35), mat, x, 0.95, 0);
    } else if (d.kind === "sectional") {
      add(new THREE.BoxGeometry(3.6, 0.48, 1.5), dark, 0, 0.4, 0);
      add(new THREE.BoxGeometry(3.25, 0.48, 1.25), mat, 0, 0.86, 0);
      add(new THREE.BoxGeometry(3.45, 1.25, 0.35), mat, 0, 1.48, 0.56);
      add(new THREE.BoxGeometry(1.25, 0.48, 2.65), mat, 1.18, 0.86, -0.68);
      for (const x of [-1.65, 1.65])
        add(new THREE.BoxGeometry(0.3, 0.72, 1.3), mat, x, 0.98, 0);
    } else if (d.kind === "armchair") {
      add(new RoundedBoxGeometry(1.65, 0.5, 1.55, 3, 0.08), dark, 0, 0.42, 0);
      add(new RoundedBoxGeometry(1.35, 0.5, 1.25, 3, 0.1), mat, 0, 0.92, 0);
      const armBackGeo = new RoundedBoxGeometry(1.45, 1.48, 0.38, 4, 0.1);
      armBackGeo.translate(0, 0.74, 0);
      const armBack = add(armBackGeo, mat, 0, 1.08, 0.52, 0.16);
      armBack.userData.pivot = "seat-back-base";
      for (const x of [-0.78, 0.78])
        add(new RoundedBoxGeometry(0.28, 0.82, 1.35, 3, 0.07), mat, x, 1, 0);
    } else if (d.kind === "coffeetable") {
      add(new THREE.BoxGeometry(2.6, 0.2, 1.5), mat, 0, 0.78, 0);
      for (const x of [-1.05, 1.05])
        for (const z of [-0.5, 0.5])
          add(
            new THREE.CylinderGeometry(0.09, 0.12, 0.75, 8),
            dark,
            x,
            0.38,
            z,
          );
      add(new THREE.BoxGeometry(2.2, 0.1, 1.1), dark, 0, 0.28, 0);
    } else if (d.kind === "tallbookcase" || d.kind === "lowbookcase") {
      const tall = d.kind === "tallbookcase",
        h = tall ? 4.2 : 1.7,
        w = tall ? 2.4 : 3.3;
      add(new THREE.BoxGeometry(w, h, 0.72), mat, 0, h / 2, 0);
      for (let i = 0; i < (tall ? 5 : 2); i++) {
        const y = 0.45 + i * (tall ? 0.78 : 0.72);
        add(new THREE.BoxGeometry(w - 0.2, 0.1, 0.75), dark, 0, y, 0.02);
        for (let j = 0; j < (tall ? 5 : 7); j++) {
          const bh = 0.35 + (j % 3) * 0.12;
          add(
            new THREE.BoxGeometry(0.18, bh, 0.5),
            new THREE.MeshStandardMaterial({
              color: PALETTE[(i + j) % PALETTE.length],
              roughness: 0.82,
            }),
            -w / 2 + 0.3 + (j * (w - 0.55)) / (tall ? 4 : 6),
            y + 0.08 + bh / 2,
            0.12,
          );
        }
      }
    } else if (d.kind === "billy") {
      const foil = new THREE.MeshStandardMaterial({
        color: d.color,
        roughness: 0.78,
      });
      const backing = new THREE.MeshStandardMaterial({
        color: new THREE.Color(d.color).offsetHSL(0, 0, 0.035),
        roughness: 0.9,
      });
      const seam = new THREE.MeshStandardMaterial({
        color: new THREE.Color(d.color).offsetHSL(0, 0, -0.1),
        roughness: 0.82,
      });
      add(
        new RoundedBoxGeometry(0.14, 4.5, 0.72, 2, 0.025),
        foil,
        -0.87,
        2.25,
        0,
      );
      add(
        new RoundedBoxGeometry(0.14, 4.5, 0.72, 2, 0.025),
        foil,
        0.87,
        2.25,
        0,
      );
      add(new THREE.BoxGeometry(1.66, 4.22, 0.055), backing, 0, 2.28, -0.34);
      for (const y of [0.12, 0.83, 1.55, 2.27, 2.99, 3.71, 4.4])
        add(new RoundedBoxGeometry(1.68, 0.105, 0.7, 2, 0.018), foil, 0, y, 0);
      add(new THREE.BoxGeometry(1.72, 0.3, 0.09), seam, 0, 0.18, 0.37);
      for (const x of [-0.775, 0.775])
        for (let i = 0; i < 12; i++)
          add(
            new THREE.SphereGeometry(0.027, 7, 5),
            seam,
            x,
            0.58 + i * 0.3,
            0.372,
          );
      for (let shelf = 0; shelf < 3; shelf++)
        for (let i = 0; i < 4; i++) {
          const h = 0.28 + (i % 3) * 0.09;
          add(
            new RoundedBoxGeometry(0.14, h, 0.48, 2, 0.018),
            new THREE.MeshStandardMaterial({
              color: PALETTE[(i + shelf * 2) % PALETTE.length],
              roughness: 0.86,
            }),
            -0.54 + i * 0.27,
            0.88 + shelf * 1.44 + h / 2,
            0.09,
            0,
            0,
            (i - 1.5) * 0.025,
          );
        }
      g.userData.sculptRuntime = {
        nodes: { root: g },
        sockets: { top: new THREE.Vector3(0, 4.5, 0) },
        colliders: [{ type: "box", size: [1.82, 4.5, 0.72] }],
        destructionGroups: { policy: "non-breakable" },
      };
    } else if (d.kind === "paxdrawers") {
      const foil = new THREE.MeshStandardMaterial({
        color: d.color,
        roughness: 0.76,
      });
      const inset = new THREE.MeshStandardMaterial({
        color: new THREE.Color(d.color).offsetHSL(0, 0, -0.035),
        roughness: 0.84,
      });
      const metal = new THREE.MeshStandardMaterial({
        color: 0x8a8e8b,
        roughness: 0.42,
        metalness: 0.55,
      });
      const pins = new THREE.MeshStandardMaterial({
        color: 0x9b9b92,
        roughness: 0.75,
      });
      add(
        new RoundedBoxGeometry(0.14, 4.5, 1.22, 2, 0.025),
        foil,
        -1.03,
        2.25,
        0,
      );
      add(
        new RoundedBoxGeometry(0.14, 4.5, 1.22, 2, 0.025),
        foil,
        1.03,
        2.25,
        0,
      );
      add(new THREE.BoxGeometry(1.98, 4.24, 0.06), inset, 0, 2.27, -0.58);
      for (const y of [0.11, 2.31, 4.4])
        add(new RoundedBoxGeometry(2.02, 0.11, 1.18, 2, 0.018), foil, 0, y, 0);
      add(
        new THREE.CylinderGeometry(0.035, 0.035, 1.82, 10),
        metal,
        0,
        3.46,
        0.03,
        0,
        0,
        Math.PI / 2,
      );
      for (const x of [-0.92, 0.92])
        for (let i = 0; i < 8; i++)
          add(
            new THREE.SphereGeometry(0.025, 7, 5),
            pins,
            x,
            2.52 + i * 0.21,
            0.57,
          );
      const drawers: THREE.Group[] = [];
      const makeDrawer = (y: number, pull: number) => {
        const pivot = new THREE.Group();
        pivot.position.set(0, y, pull);
        pivot.userData.animationRole = "articulated";
        pivot.userData.slideAxis = "z";
        g.add(pivot);
        drawers.push(pivot);
        const piece = (
          geo: THREE.BufferGeometry,
          m: THREE.Material,
          x: number,
          py: number,
          z: number,
        ) => {
          const o = new THREE.Mesh(geo, m);
          o.position.set(x, py, z);
          o.castShadow = true;
          o.receiveShadow = true;
          pivot.add(o);
          return o;
        };
        piece(new THREE.BoxGeometry(1.92, 0.08, 1.02), inset, 0, -0.2, 0.05);
        for (const x of [-0.91, 0.91])
          piece(new THREE.BoxGeometry(0.1, 0.46, 1.05), foil, x, 0, 0.05);
        piece(new THREE.BoxGeometry(1.92, 0.46, 0.08), foil, 0, 0, -0.45);
        piece(new THREE.BoxGeometry(1.98, 0.5, 0.11), foil, 0, 0, 0.6);
        piece(new THREE.BoxGeometry(1.62, 0.28, 0.025), inset, 0, 0, 0.663);
        for (const x of [-0.87, 0.87])
          piece(new THREE.BoxGeometry(0.1, 0.4, 0.035), foil, x, 0, 0.68);
        for (const py of [-0.2, 0.2])
          piece(new THREE.BoxGeometry(1.78, 0.1, 0.035), foil, 0, py, 0.68);
      };
      makeDrawer(0.48, 0);
      makeDrawer(1.08, 0);
      makeDrawer(1.68, 0.28);
      for (const y of [0.48, 1.08, 1.68])
        for (const x of [-0.98, 0.98])
          add(new THREE.BoxGeometry(0.04, 0.08, 0.82), metal, x, y, 0.02);
      for (let i = 0; i < 3; i++) {
        add(
          new RoundedBoxGeometry(0.42, 0.7, 0.12, 2, 0.035),
          new THREE.MeshStandardMaterial({
            color: PALETTE[(i + 1) % PALETTE.length],
            roughness: 0.88,
          }),
          -0.53 + i * 0.53,
          3.03,
          0.05,
        );
        add(
          new THREE.TorusGeometry(0.19, 0.018, 6, 14, Math.PI),
          metal,
          -0.53 + i * 0.53,
          3.44,
          0.03,
          0,
          0,
          Math.PI,
        );
      }
      g.userData.sculptRuntime = {
        nodes: { root: g, drawers },
        sockets: {
          top: new THREE.Vector3(0, 4.5, 0),
          rail: new THREE.Vector3(0, 3.46, 0.03),
        },
        colliders: [{ type: "box", size: [2.13, 4.5, 1.22] }],
        destructionGroups: { policy: "non-breakable" },
      };
    } else if (d.kind === "cubestorage") {
      add(new THREE.BoxGeometry(3, 2.5, 0.75), mat, 0, 1.25, 0);
      for (const x of [-0.5, 0.5])
        add(new THREE.BoxGeometry(0.1, 2.3, 0.8), dark, x, 1.25, 0.02);
      for (const y of [0.83, 1.67])
        add(new THREE.BoxGeometry(2.8, 0.1, 0.8), dark, 0, y, 0.02);
      for (let i = 0; i < 4; i++)
        add(
          new THREE.BoxGeometry(0.65, 0.55, 0.55),
          new THREE.MeshStandardMaterial({
            color: PALETTE[(i + 1) % PALETTE.length],
            roughness: 0.9,
          }),
          -0.92 + (i % 3) * 0.92,
          0.38 + Math.floor(i / 3) * 0.82,
          0.14,
        );
    } else if (d.kind === "deskchair") {
      add(new THREE.CylinderGeometry(0.65, 0.7, 0.18, 20), mat, 0, 1.05, 0);
      const deskChairBackGeo = new RoundedBoxGeometry(
        1.25,
        1.35,
        0.22,
        4,
        0.07,
      );
      deskChairBackGeo.translate(0, 0.675, 0);
      const deskChairBack = add(deskChairBackGeo, mat, 0, 1.08, 0.5, 0.16);
      deskChairBack.userData.pivot = "seat-back-base";
      add(new THREE.CylinderGeometry(0.08, 0.1, 0.85, 8), dark, 0, 0.55, 0);
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        add(
          new THREE.BoxGeometry(0.65, 0.07, 0.09),
          dark,
          Math.cos(a) * 0.3,
          0.12,
          Math.sin(a) * 0.3,
          0,
          -a,
          0,
        );
        add(
          new THREE.SphereGeometry(0.09, 8, 6),
          dark,
          Math.cos(a) * 0.62,
          0.08,
          Math.sin(a) * 0.62,
        );
      }
    } else if (d.kind === "filing") {
      add(new THREE.BoxGeometry(1.4, 1.7, 1.15), mat, 0, 0.85, 0);
      for (let i = 0; i < 3; i++) {
        add(
          new THREE.BoxGeometry(1.18, 0.45, 0.07),
          dark,
          0,
          0.4 + i * 0.52,
          0.61,
        );
        add(
          new THREE.BoxGeometry(0.34, 0.05, 0.08),
          cream,
          0,
          0.4 + i * 0.52,
          0.68,
        );
      }
    } else if (d.kind === "deskset") {
      add(new THREE.BoxGeometry(3.7, 0.18, 1.5), mat, 0, 1.72, 0);
      for (const x of [-1.55, 1.55])
        add(new THREE.BoxGeometry(0.18, 1.65, 1.25), dark, x, 0.86, 0);
      add(new THREE.BoxGeometry(1.05, 1.2, 0.15), dark, 0, 2.42, 0.12);
      add(
        new THREE.BoxGeometry(0.88, 0.95, 0.04),
        new THREE.MeshBasicMaterial({ color: 0x8ab8bd }),
        0,
        2.42,
        0.22,
      );
      add(new THREE.BoxGeometry(1.6, 0.08, 0.55), cream, 0, 1.86, -0.08);
    } else if (d.kind === "wardrobe") {
      add(new THREE.BoxGeometry(2.7, 3.8, 1.15), mat, 0, 1.9, 0);
      add(new THREE.BoxGeometry(0.035, 3.45, 0.025), dark, 0, 2, 0.588);
      for (const x of [-0.22, 0.22])
        add(new THREE.SphereGeometry(0.07, 10, 8), cream, x, 2, 0.65);
      add(new THREE.BoxGeometry(2.85, 0.18, 1.3), dark, 0, 0.12, 0);
    } else if (d.kind === "nightstand") {
      add(new THREE.BoxGeometry(1.35, 1.25, 1.1), mat, 0, 0.82, 0);
      add(new THREE.BoxGeometry(1.15, 0.08, 0.08), dark, 0, 1, 0.58);
      add(new THREE.SphereGeometry(0.06, 8, 6), cream, 0, 1, 0.65);
      for (const x of [-0.5, 0.5])
        for (const z of [-0.4, 0.4])
          add(new THREE.CylinderGeometry(0.06, 0.08, 0.35, 8), dark, x, 0.2, z);
    } else if (d.kind === "ottoman") {
      add(new THREE.CylinderGeometry(0.85, 0.9, 0.6, 20), mat, 0, 0.32, 0);
      add(
        new THREE.TorusGeometry(0.7, 0.035, 8, 24),
        cream,
        0,
        0.62,
        0,
        Math.PI / 2,
      );
    } else if (d.kind === "cushion") {
      const pillow = add(
        new THREE.SphereGeometry(0.72, 24, 16),
        mat,
        0,
        0.38,
        0,
      );
      pillow.scale.set(1.15, 0.48, 0.92);
      add(
        new THREE.TorusGeometry(0.66, 0.025, 7, 28),
        cream,
        0,
        0.4,
        0,
        Math.PI / 2,
      );
      add(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), dark, 0, 0.73, 0);
      for (const a of [0, Math.PI / 2])
        add(
          new THREE.BoxGeometry(1.05, 0.018, 0.035),
          cream,
          0,
          0.735,
          0,
          0,
          a,
          0,
        );
    } else if (d.kind === "toybox") {
      add(new THREE.BoxGeometry(2.3, 1.1, 1.3), mat, 0, 0.55, 0);
      add(new THREE.BoxGeometry(2.4, 0.18, 1.4), dark, 0, 1.2, -0.08, -0.18);
      for (const x of [-0.8, 0.8])
        add(new THREE.BoxGeometry(0.3, 0.3, 0.04), cream, x, 0.55, 0.67);
    } else if (d.kind === "dresser") {
      add(new THREE.BoxGeometry(2.5, 1.8, 1), mat, 0, 0.9, 0);
      for (let i = 0; i < 3; i++) {
        add(
          new THREE.BoxGeometry(2.2, 0.42, 0.06),
          dark,
          0,
          0.45 + i * 0.55,
          0.53,
        );
        add(
          new THREE.SphereGeometry(0.055, 8, 6),
          cream,
          0,
          0.45 + i * 0.55,
          0.61,
        );
      }
      add(new THREE.TorusGeometry(0.72, 0.08, 10, 30), dark, 0, 2.75, 0.1);
      add(
        new THREE.CircleGeometry(0.64, 30),
        new THREE.MeshStandardMaterial({
          color: 0xbdd4d2,
          metalness: 0.3,
          roughness: 0.2,
        }),
        0,
        2.75,
        0.12,
      );
    } else if (d.kind === "lantern") {
      add(
        new THREE.CylinderGeometry(0.65, 0.65, 1.35, 16),
        new THREE.MeshStandardMaterial({
          color: d.color,
          transparent: true,
          opacity: 0.72,
          roughness: 0.8,
        }),
        0,
        0.9,
        0,
      );
      for (const y of [0.25, 1.55])
        add(
          new THREE.TorusGeometry(0.65, 0.035, 8, 20),
          dark,
          0,
          y,
          0,
          Math.PI / 2,
        );
      const b = add(
        new THREE.SphereGeometry(0.13, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xffc66d }),
        0,
        0.9,
        0,
      );
      b.userData.glow = true;
    } else if (d.kind === "candles") {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.38,
          h = 0.55 + i * 0.22;
        add(new THREE.CylinderGeometry(0.12, 0.14, h, 12), cream, x, h / 2, 0);
        const f = add(
          new THREE.SphereGeometry(0.08, 10, 7),
          new THREE.MeshBasicMaterial({ color: 0xffa43b }),
          x,
          h + 0.08,
          0,
        );
        f.scale.y = 1.6;
        f.userData.glow = true;
      }
    } else if (d.kind === "lavalamp") {
      add(new THREE.CylinderGeometry(0.38, 0.5, 0.24, 16), dark, 0, 0.12, 0);
      add(
        new THREE.CylinderGeometry(0.25, 0.42, 1.2, 16),
        new THREE.MeshPhysicalMaterial({
          color: d.color,
          transparent: true,
          opacity: 0.75,
          roughness: 0.12,
        }),
        0,
        0.82,
        0,
      );
      add(
        new THREE.SphereGeometry(0.14, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xff9c66 }),
        0,
        0.85,
        0,
      );
    } else if (d.kind === "camera") {
      add(new THREE.BoxGeometry(1.2, 0.75, 0.45), mat, 0, 0.52, 0);
      add(
        new THREE.CylinderGeometry(0.28, 0.33, 0.32, 18),
        dark,
        0,
        0.52,
        0.35,
        Math.PI / 2,
      );
      add(
        new THREE.CylinderGeometry(0.19, 0.19, 0.34, 18),
        new THREE.MeshPhysicalMaterial({
          color: 0x90b7bd,
          metalness: 0.4,
          roughness: 0.15,
        }),
        0,
        0.52,
        0.52,
        Math.PI / 2,
      );
      add(new THREE.BoxGeometry(0.3, 0.16, 0.2), cream, 0.32, 0.98, 0);
    } else if (d.kind === "monitor") {
      add(new THREE.BoxGeometry(1.65, 1.1, 0.16), dark, 0, 1, 0.05);
      add(
        new THREE.BoxGeometry(1.45, 0.88, 0.035),
        new THREE.MeshBasicMaterial({ color: 0x83afb6 }),
        0,
        1,
        0.15,
      );
      add(new THREE.CylinderGeometry(0.07, 0.1, 0.52, 8), dark, 0, 0.28, 0);
      add(new THREE.BoxGeometry(0.85, 0.08, 0.55), dark, 0, 0.05, 0);
    } else if (d.kind === "laptop") {
      add(new RoundedBoxGeometry(1.55, 0.08, 1.05, 3, 0.04), dark, 0, 0.06, 0);
      add(new THREE.BoxGeometry(1.5, 0.9, 0.08), dark, 0, 0.52, -0.47, -0.18);
      add(
        new THREE.BoxGeometry(1.32, 0.72, 0.025),
        new THREE.MeshBasicMaterial({ color: 0x91bbc1 }),
        0,
        0.53,
        -0.53,
        -0.18,
      );
      add(
        new THREE.CylinderGeometry(0.055, 0.055, 1.25, 10),
        dark,
        0,
        0.12,
        -0.47,
        0,
        0,
        Math.PI / 2,
      );
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 10; col++)
          add(
            new THREE.BoxGeometry(0.095, 0.022, 0.065),
            cream,
            -0.52 + col * 0.116,
            0.118,
            -0.17 + row * 0.09,
          );
      add(
        new THREE.BoxGeometry(0.52, 0.018, 0.24),
        new THREE.MeshStandardMaterial({ color: 0xbca98f, roughness: 0.55 }),
        0,
        0.114,
        0.34,
      );
    } else if (d.kind === "keyboard") {
      add(new RoundedBoxGeometry(1.55, 0.1, 0.58, 3, 0.045), cream, 0, 0.06, 0);
      for (let i = 0; i < 5; i++)
        for (let j = 0; j < 10; j++)
          add(
            new RoundedBoxGeometry(0.1, 0.025, 0.07, 2, 0.012),
            dark,
            -0.55 + j * 0.12,
            0.13,
            -0.2 + i * 0.1,
          );
      const mouseBase = add(
        new RoundedBoxGeometry(0.58, 0.08, 0.76, 4, 0.06),
        dark,
        1.12,
        0.07,
        0.03,
      );
      mouseBase.userData.part = "mouse-base";
      const mouseShell = add(
        new THREE.SphereGeometry(0.3, 24, 16),
        mat,
        1.12,
        0.18,
        0.03,
      );
      mouseShell.scale.set(1.02, 0.48, 1.28);
      for (const x of [1.0, 1.24])
        add(
          new RoundedBoxGeometry(0.2, 0.035, 0.27, 3, 0.035),
          cream,
          x,
          0.315,
          -0.14,
          -0.08,
        );
      add(
        new THREE.BoxGeometry(0.018, 0.025, 0.29),
        dark,
        1.12,
        0.325,
        -0.13,
        -0.08,
      );
      add(
        new THREE.CylinderGeometry(0.045, 0.045, 0.07, 12),
        dark,
        1.12,
        0.35,
        -0.08,
        0,
        0,
        Math.PI / 2,
      );
    } else if (d.kind === "speakers") {
      for (const x of [-0.55, 0.55]) {
        add(new THREE.BoxGeometry(0.55, 1, 0.45), dark, x, 0.5, 0);
        add(new THREE.CircleGeometry(0.17, 18), mat, x, 0.62, 0.231);
        add(new THREE.CircleGeometry(0.09, 14), cream, x, 0.28, 0.235);
      }
    } else if (d.kind === "printer") {
      add(new THREE.BoxGeometry(1.5, 0.72, 1.1), mat, 0, 0.38, 0);
      add(new THREE.BoxGeometry(1.18, 0.12, 0.75), dark, 0, 0.8, -0.08);
      add(
        new THREE.BoxGeometry(0.95, 0.035, 0.7),
        cream,
        0,
        0.95,
        -0.18,
        -0.18,
      );
      add(new THREE.BoxGeometry(0.8, 0.12, 0.55), dark, 0, 0.28, 0.55, 0.2);
    } else if (d.kind === "desktop") {
      add(new THREE.BoxGeometry(0.65, 1.25, 0.75), dark, 1.15, 0.65, 0);
      add(new THREE.BoxGeometry(1.65, 1.1, 0.16), dark, -0.2, 1.05, 0.05);
      add(
        new THREE.BoxGeometry(1.43, 0.87, 0.035),
        new THREE.MeshBasicMaterial({ color: 0x7faeb5 }),
        -0.2,
        1.05,
        0.15,
      );
      add(new THREE.CylinderGeometry(0.06, 0.09, 0.45, 8), dark, -0.2, 0.35, 0);
      add(new THREE.BoxGeometry(0.82, 0.07, 0.5), dark, -0.2, 0.08, 0);
      add(new THREE.BoxGeometry(1.35, 0.08, 0.48), cream, -0.15, 0.06, 0.7);
    } else if (d.kind === "record") {
      add(new THREE.BoxGeometry(1.55, 0.3, 1.3), mat, 0, 0.2, 0);
      add(
        new THREE.CylinderGeometry(0.48, 0.48, 0.05, 32),
        dark,
        -0.18,
        0.39,
        0,
      );
      add(
        new THREE.CylinderGeometry(0.08, 0.08, 0.08, 16),
        cream,
        -0.18,
        0.43,
        0,
      );
      add(
        new THREE.BoxGeometry(0.08, 0.06, 0.72),
        cream,
        0.48,
        0.48,
        0.05,
        0,
        0.25,
        0.12,
      );
    } else if (d.kind === "musicbox") {
      add(new THREE.BoxGeometry(1.25, 0.65, 0.9), mat, 0, 0.38, 0);
      add(new THREE.BoxGeometry(1.35, 0.12, 1), dark, 0, 0.77, 0);
      const dancer = add(
        new THREE.CylinderGeometry(0.08, 0.12, 0.55, 10),
        cream,
        0,
        1.12,
        0,
      );
      dancer.rotation.z = 0.08;
    } else if (d.kind === "snowglobe") {
      add(new THREE.CylinderGeometry(0.42, 0.52, 0.28, 18), dark, 0, 0.14, 0);
      add(
        new THREE.SphereGeometry(0.48, 20, 15),
        new THREE.MeshPhysicalMaterial({
          color: 0xc6e0df,
          transparent: true,
          opacity: 0.48,
          roughness: 0.05,
        }),
        0,
        0.68,
        0,
      );
      add(new THREE.ConeGeometry(0.18, 0.5, 8), mat, 0, 0.62, 0);
    } else if (d.kind === "globe") {
      add(
        new THREE.SphereGeometry(0.62, 20, 14),
        new THREE.MeshStandardMaterial({ color: 0x6a9c98, roughness: 0.75 }),
        0,
        1.25,
        0,
      );
      add(
        new THREE.TorusGeometry(0.68, 0.045, 8, 28),
        dark,
        0,
        1.25,
        0,
        0,
        0,
        0.25,
      );
      add(new THREE.CylinderGeometry(0.06, 0.08, 0.75, 8), dark, 0, 0.52, 0);
      add(new THREE.CylinderGeometry(0.45, 0.55, 0.12, 16), dark, 0, 0.08, 0);
    } else if (d.kind === "dollhouse") {
      add(new THREE.BoxGeometry(1.65, 1.25, 0.75), mat, 0, 0.68, 0);
      add(
        new THREE.ConeGeometry(1.25, 0.85, 4),
        dark,
        0,
        1.72,
        0,
        0,
        Math.PI / 4,
      );
      for (const x of [-0.45, 0.45])
        add(new THREE.BoxGeometry(0.35, 0.42, 0.06), cream, x, 0.72, 0.41);
    } else if (d.kind === "roundrug") {
      const r = add(
        new THREE.CylinderGeometry(1.7, 1.7, 0.04, 32),
        mat,
        0,
        0.025,
        0,
      );
      r.receiveShadow = true;
      for (const s of [0.55, 1.05, 1.45])
        add(
          new THREE.TorusGeometry(s, 0.035, 6, 32),
          cream,
          0,
          0.06,
          0,
          Math.PI / 2,
        );
    } else if (d.kind === "memoryrug") {
      const rug = add(
        new THREE.PlaneGeometry(7.6, 5.8),
        new THREE.MeshStandardMaterial({
          map: this.floorTex,
          color: d.color,
          roughness: 1,
        }),
        0,
        0.025,
        0,
        -Math.PI / 2,
      );
      rug.castShadow = false;
      rug.receiveShadow = true;
    } else if (d.kind === "window") {
      const frame = new THREE.MeshStandardMaterial({
        color: 0xf3e8d1,
        roughness: 0.55,
      });
      const sky = new THREE.MeshBasicMaterial({
        color: 0xb7dce3,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const glass = new THREE.MeshPhysicalMaterial({
        color: 0xe2f5f4,
        transparent: true,
        opacity: 0.42,
        roughness: 0.08,
        metalness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const shine = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      const skyPane = add(
        new THREE.PlaneGeometry(4.12, 2.92),
        sky,
        0,
        1.55,
        -0.025,
      );
      skyPane.castShadow = false;
      const glassPane = add(
        new THREE.PlaneGeometry(4.16, 2.96),
        glass,
        0,
        1.55,
        0.035,
      );
      glassPane.castShadow = false;
      for (const x of [-1.32, 0.82]) {
        const reflection = add(
          new THREE.PlaneGeometry(0.07, 2.68),
          shine,
          x,
          1.55,
          0.055,
          0,
          0,
          -0.09,
        );
        reflection.castShadow = false;
      }
      for (const [x, y, w, h] of [
        [0, 3.1, 4.7, 0.18],
        [0, 0, 4.7, 0.18],
        [-2.35, 1.55, 0.18, 3.3],
        [2.35, 1.55, 0.18, 3.3],
        [0, 1.55, 0.14, 3.1],
        [0, 1.55, 4.4, 0.12],
      ] as number[][])
        add(new THREE.BoxGeometry(w, h, 0.18), frame, x, y, 0.16);
      for (const x of [-2.75, 2.75])
        add(
          new THREE.PlaneGeometry(1.1, 3.8, 6, 8),
          new THREE.MeshStandardMaterial({
            color: d.color,
            roughness: 1,
            side: THREE.DoubleSide,
          }),
          x,
          1.55,
          0.29,
          0,
          x < 0 ? 0.18 : -0.18,
        );
    } else if (d.kind === "wallframes") {
      [0xd19b78, 0x78928b, 0xd7b363].forEach((color, i) => {
        const x = (1 - i) * 1.35,
          y = (i - 1) * 1.25;
        add(new THREE.BoxGeometry(1.25, 1.55, 0.08), mat, x, y, 0);
        add(
          new THREE.PlaneGeometry(1.05, 1.35),
          new THREE.MeshBasicMaterial({ color }),
          x,
          y,
          0.05,
        );
      });
    } else if (d.kind === "wallshelf") {
      add(new THREE.BoxGeometry(3, 0.18, 0.75), mat, 0, 0, 0);
      for (let i = 0; i < 4; i++) {
        const book = add(
          new THREE.BoxGeometry(0.28, 0.7, 0.55),
          new THREE.MeshStandardMaterial({
            color: PALETTE[i],
            roughness: 0.85,
          }),
          -0.8 + i * 0.35,
          0.45,
          0,
        );
        book.rotation.z = (i - 1.5) * 0.04;
      }
    } else if (d.kind === "mirror") {
      add(new THREE.BoxGeometry(1.8, 0.18, 0.72), dark, 0, 0.09, 0);
      for (const x of [-0.62, 0.62])
        add(
          new THREE.BoxGeometry(0.18, 0.72, 0.5),
          dark,
          x,
          0.44,
          0,
          0,
          0,
          x < 0 ? -0.12 : 0.12,
        );
      add(new THREE.BoxGeometry(1.55, 2.95, 0.18), dark, 0, 2.05, 0);
      add(
        new THREE.BoxGeometry(1.28, 2.66, 0.04),
        new THREE.MeshPhysicalMaterial({
          color: 0xb9d6d8,
          metalness: 0.28,
          roughness: 0.08,
          clearcoat: 1,
          clearcoatRoughness: 0.06,
        }),
        0,
        2.05,
        0.115,
      );
      add(
        new THREE.BoxGeometry(0.08, 2.35, 0.025),
        new THREE.MeshBasicMaterial({
          color: 0xeaf8f4,
          transparent: true,
          opacity: 0.55,
        }),
        -0.43,
        2.08,
        0.142,
        0,
        0,
        -0.035,
      );
    } else if (d.kind === "clock") {
      add(new THREE.BoxGeometry(1.25, 0.9, 0.42), mat, 0, 0.52, 0);
      add(new THREE.CircleGeometry(0.32, 24), cream, 0, 0.58, 0.23);
      for (let i = 0; i < 4; i++)
        add(
          new THREE.BoxGeometry(0.035, 0.18, 0.03),
          dark,
          Math.sin((i * Math.PI) / 2) * 0.22,
          0.58 + Math.cos((i * Math.PI) / 2) * 0.22,
          0.25,
          0,
          0,
          (-i * Math.PI) / 2,
        );
    } else if (d.kind === "basket") {
      const weave = new THREE.MeshStandardMaterial({
        color: d.color,
        roughness: 0.95,
        side: THREE.DoubleSide,
      });
      add(
        new THREE.CylinderGeometry(0.72, 0.56, 0.78, 24, 3, true),
        weave,
        0,
        0.4,
        0,
      );
      add(new THREE.CylinderGeometry(0.53, 0.48, 0.08, 24), dark, 0, 0.08, 0);
      add(
        new THREE.TorusGeometry(0.72, 0.065, 8, 28),
        dark,
        0,
        0.79,
        0,
        Math.PI / 2,
      );
      add(
        new THREE.TorusGeometry(0.57, 0.065, 8, 24, Math.PI),
        dark,
        0,
        0.8,
        0,
      );
      for (let i = 0; i < 7; i++)
        add(
          new THREE.TorusGeometry(0.57 - i * 0.012, 0.018, 5, 24),
          cream,
          0,
          0.18 + i * 0.09,
          0,
          Math.PI / 2,
        );
    } else if (d.kind === "plant" || d.kind === "flowers") {
      add(new THREE.CylinderGeometry(0.38, 0.28, 0.7, 16), mat, 0, 0.38, 0);
      for (let i = 0; i < (d.kind === "plant" ? 11 : 7); i++) {
        const a = i * 2.4,
          r = 0.3 + (i % 3) * 0.1;
        const stem = add(
          new THREE.CylinderGeometry(0.025, 0.035, 0.8, 6),
          new THREE.MeshStandardMaterial({ color: 0x55704d }),
          Math.cos(a) * r * 0.35,
          1,
          Math.sin(a) * r * 0.35,
          Math.sin(a) * 0.35,
          0,
          Math.cos(a) * 0.35,
        );
        if (d.kind === "flowers")
          add(
            new THREE.SphereGeometry(0.14, 10, 8),
            new THREE.MeshStandardMaterial({
              color: PALETTE[i % PALETTE.length],
            }),
            stem.position.x,
            1.45,
            stem.position.z,
          );
      }
    } else if (
      d.kind === "cactus" ||
      d.kind === "monstera" ||
      d.kind === "mushroom"
    ) {
      add(new THREE.CylinderGeometry(0.42, 0.3, 0.62, 14), mat, 0, 0.32, 0);
      const green = new THREE.MeshStandardMaterial({
        color: d.kind === "mushroom" ? 0xdba58d : 0x577b55,
        roughness: 0.85,
      });
      if (d.kind === "cactus") {
        add(new THREE.CapsuleGeometry(0.22, 0.85, 5, 10), green, 0, 1.15, 0);
        for (const x of [-0.28, 0.28])
          add(
            new THREE.CapsuleGeometry(0.11, 0.38, 4, 8),
            green,
            x,
            1.2,
            0,
            0,
            0,
            x > 0 ? -0.55 : 0.55,
          );
      } else if (d.kind === "monstera") {
        for (let i = 0; i < 8; i++) {
          const a = i * 0.78;
          add(
            new THREE.SphereGeometry(0.3, 10, 8),
            green,
            Math.cos(a) * 0.5,
            1 + Math.sin(a * 0.7) * 0.5,
            Math.sin(a) * 0.5,
            0,
            a,
            0,
          );
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const x = (i - 2) * 0.25;
          add(
            new THREE.CylinderGeometry(0.06, 0.08, 0.45, 8),
            cream,
            x,
            0.85,
            0,
          );
          add(
            new THREE.SphereGeometry(
              0.22,
              12,
              8,
              0,
              Math.PI * 2,
              0,
              Math.PI / 2,
            ),
            green,
            x,
            1.08,
            0,
          );
        }
      }
    }
    g.position.set(d.x, d.y ?? 0, d.z);
    g.rotation.y = d.rot;
    g.scale.setScalar(d.scale ?? 1);
    return g;
  }
  private ownerOf(o: THREE.Object3D) {
    let owner = o;
    while (owner.parent && !owner.userData.itemId) owner = owner.parent;
    return owner.userData.itemId ? (owner as THREE.Group) : undefined;
  }
  private supportTop(g: THREE.Group) {
    const d = this.data.find((x) => x.id === g.userData.itemId);
    return (
      g.position.y +
      (SUPPORT_HEIGHTS[d?.kind ?? ""] ??
        new THREE.Box3().setFromObject(g).max.y - g.position.y) *
        (d?.scale ?? 1)
    );
  }
  private pointerDown(e: PointerEvent) {
    if (this.firstPerson) return;
    if ((e.target as HTMLElement) !== this.canvas) return;
    if (this.placement) {
      this.updatePlacementFromPointer(e);
      this.commitPlacement();
      return;
    }
    this.setPointer(e);
    this.ray.setFromCamera(this.pointer, this.camera);
    const hits = this.ray.intersectObjects([...this.items.values()], true);
    if (hits.length) {
      const g = this.ownerOf(hits[0].object);
      if (!g) return;
      this.select(g);
      this.checkpoint();
      this.drag = true;
      this.controls.enabled = false;
      const d = this.data.find((x) => x.id === g.userData.itemId);
      if (d) this.dragValid = true;
      this.doorFollowers = [];
      if (d && ARCHITECTURAL_KINDS.has(d.kind)) {
        const room = this.extensionRect(d);
        if (room)
          this.doorFollowers = this.data
            .filter(
              (item) =>
                item.id !== d.id &&
                item.x >= room.minX &&
                item.x <= room.maxX &&
                item.z >= room.minZ &&
                item.z <= room.maxZ,
            )
            .map((item) => item.id);
      }
      this.dragHeight = d?.supportId ? 0 : g.position.y;
      const hit = new THREE.Vector3();
      this.ray.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.dragHeight),
        hit,
      );
      this.dragOffset.copy(g.position).sub(hit);
      this.canvas.setPointerCapture(e.pointerId);
    } else this.select(undefined);
  }
  private pointerMove(e: PointerEvent) {
    if (this.firstPerson) return;
    if (this.placement) {
      this.updatePlacementFromPointer(e);
      return;
    }
    if (!this.drag || !this.selected) return;
    this.setPointer(e);
    this.ray.setFromCamera(this.pointer, this.camera);
    const d = this.findData();
    if (!d) return;
    const oldX = d.x,
      oldZ = d.z;
    if (ARCHITECTURAL_KINDS.has(d.kind)) {
      const hit = new THREE.Vector3();
      if (
        this.ray.ray.intersectPlane(
          new THREE.Plane(new THREE.Vector3(0, 1, 0)),
          hit,
        )
      ) {
        hit.add(this.dragOffset);
        this.snapDoorToWall(d, hit.x, hit.z);
        const dx = d.x - oldX,
          dz = d.z - oldZ;
        this.selected.position.set(d.x, 0, d.z);
        this.selected.rotation.y = d.rot;
        this.syncArchitecturalExtension(d);
        for (const id of this.doorFollowers) {
          const follower = this.data.find((item) => item.id === id);
          if (!follower) continue;
          follower.x += dx;
          follower.z += dz;
          this.items
            .get(id)
            ?.position.set(follower.x, follower.y ?? 0, follower.z);
        }
      }
      return;
    }
    let support: THREE.Group | undefined;
    if (!FLOOR_ONLY_KINDS.has(d.kind)) {
      for (const h of this.ray.intersectObjects(
        [...this.items.values()].filter((g) => g !== this.selected),
        true,
      )) {
        const candidate = this.ownerOf(h.object);
        const candidateData = this.data.find(
          (x) => x.id === candidate?.userData.itemId,
        );
        if (
          candidate &&
          candidateData &&
          SUPPORT_KINDS.has(candidateData.kind)
        ) {
          support = candidate;
          break;
        }
      }
    }
    if (support) {
      const top = this.supportTop(support);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -top);
      const hit = new THREE.Vector3();
      if (this.ray.ray.intersectPlane(plane, hit)) {
        const p = this.clampToRoom(
          this.selected,
          this.gridSnap ? Math.round(hit.x * 2) / 2 : hit.x,
          this.gridSnap ? Math.round(hit.z * 2) / 2 : hit.z,
        );
        d.x = p.x;
        d.z = p.z;
        d.y = top + 0.025;
        d.supportId = support.userData.itemId;
      }
    } else {
      const hit = new THREE.Vector3();
      if (
        this.ray.ray.intersectPlane(
          new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.dragHeight),
          hit,
        )
      ) {
        hit.add(this.dragOffset);
        const p = this.clampToRoom(
          this.selected,
          this.gridSnap ? Math.round(hit.x * 2) / 2 : hit.x,
          this.gridSnap ? Math.round(hit.z * 2) / 2 : hit.z,
        );
        d.x = p.x;
        d.z = p.z;
        d.y = this.dragHeight;
        d.supportId = undefined;
      }
    }
    this.selected.position.set(d.x, d.y ?? 0, d.z);
    if (SUPPORT_KINDS.has(d.kind)) {
      const dx = d.x - oldX,
        dz = d.z - oldZ;
      for (const child of this.data.filter((x) => x.supportId === d.id)) {
        child.x += dx;
        child.z += dz;
        child.y = this.supportTop(this.selected) + 0.025;
        const childGroup = this.items.get(child.id);
        if (childGroup) childGroup.position.set(child.x, child.y, child.z);
      }
    }
    const ignored = new Set<string>();
    if (d.supportId) ignored.add(d.supportId);
    for (const child of this.data.filter((item) => item.supportId === d.id))
      ignored.add(child.id);
    this.dragValid = !this.objectCollision(this.selected, d, ignored);
    this.setDragFeedback(this.dragValid);
  }
  private pointerUp() {
    if (this.drag) {
      const architectural = ARCHITECTURAL_KINDS.has(
        this.findData()?.kind ?? "",
      );
      this.drag = false;
      this.controls.enabled = true;
      this.doorFollowers = [];
      if (!this.dragValid) {
        const previous = this.history.pop();
        if (previous) {
          this.data = previous;
          this.rebuild();
        }
        this.announce("That position overlaps another object. The move was cancelled.");
      } else {
        if (architectural) this.rebuildRoom();
        this.setDragFeedback(true, true);
        this.audio("place");
        this.changed();
      }
      this.dragValid = true;
    }
  }
  private setDragFeedback(valid: boolean, neutral = false) {
    if (!this.selected) return;
    const color = neutral ? 0xffd27a : valid ? 0x52b86d : 0xe05247;
    this.selected.traverse((object) => {
      if (
        object instanceof THREE.LineSegments &&
        object.userData.selectionGlow &&
        object.material instanceof THREE.LineBasicMaterial
      )
        object.material.color.setHex(color);
    });
  }
  private setPointer(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
  }
  private clearSelectionGlow() {
    if (!this.selected) return;
    const glows: THREE.LineSegments[] = [];
    this.selected.traverse((o) => {
      if (o instanceof THREE.LineSegments && o.userData.selectionGlow)
        glows.push(o);
      else if (o instanceof THREE.Mesh) {
        const m = o.material as THREE.MeshStandardMaterial;
        if (m.emissive) {
          m.emissive.setHex(0);
          m.emissiveIntensity = 1;
        }
      }
    });
    for (const glow of glows) {
      glow.removeFromParent();
      glow.geometry.dispose();
      (glow.material as THREE.Material).dispose();
    }
  }
  private select(g?: THREE.Group) {
    this.clearSelectionGlow();
    this.selected = g;
    this.syncSelectionSurface();
    const selectedData = g
      ? this.data.find((item) => item.id === g.userData.itemId)
      : undefined;
    const isDoor = Boolean(
      selectedData && ARCHITECTURAL_KINDS.has(selectedData.kind),
    );
    for (const selector of ["#lower", "#raise"]) {
      const button = document.querySelector<HTMLButtonElement>(selector);
      if (button) button.disabled = isDoor;
    }
    if (g) {
      document.querySelector("#selected-name")!.textContent =
        selectedData?.name ?? g.name;
      const colorInput = document.querySelector<HTMLInputElement>("#color");
      if (colorInput && selectedData)
        colorInput.value = `#${new THREE.Color(selectedData.color).getHexString()}`;
      const meshes: THREE.Mesh[] = [];
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) meshes.push(o);
      });
      for (const mesh of meshes) {
        const m = mesh.material as THREE.MeshStandardMaterial;
        if (m.emissive) {
          m.emissive.setHex(0x7a3e12);
          m.emissiveIntensity = 0.28;
        }
        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(mesh.geometry, 28),
          new THREE.LineBasicMaterial({
            color: 0xffd27a,
            transparent: true,
            opacity: 0.8,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          }),
        );
        outline.userData.selectionGlow = true;
        outline.renderOrder = 999;
        outline.scale.setScalar(1.018);
        mesh.add(outline);
      }
    }
    this.syncObjectManagerSelection();
  }
  private syncSelectionSurface() {
    const overlayOpen =
      this.compactToolsQuery.matches &&
      ["catalog", "room-panel", "file-panel", "secondary-actions"].some(
        (id) => this.surfaces.isOpen(id),
      );
    this.surfaces.setPersistent(
      "selection",
      Boolean(this.selected) && !overlayOpen && !this.firstPerson,
    );
  }
  private syncTransformReadout() {
    const data = this.findData(),
      output = document.querySelector<HTMLElement>("#selected-transform");
    if (!data || !output) return;
    const degrees = ((THREE.MathUtils.radToDeg(data.rot) % 360) + 360) % 360;
    output.textContent = `${Math.round(degrees)}° · ${Math.round((data.scale ?? 1) * 100)}% · ${(data.y ?? 0).toFixed(1)} high`;
  }
  private syncSnapControl() {
    const button = document.querySelector<HTMLButtonElement>("#snap-toggle");
    if (!button) return;
    button.textContent = `⌗ Grid snap: ${this.gridSnap ? "On" : "Off"}`;
    button.setAttribute("aria-pressed", String(this.gridSnap));
  }
  private keepSelectedInRoom() {
    const d = this.findData();
    if (!d || !this.selected) return;
    if (ARCHITECTURAL_KINDS.has(d.kind)) {
      this.snapDoorToWall(d, d.x, d.z);
      this.selected.position.set(d.x, 0, d.z);
      this.selected.rotation.y = d.rot;
      this.syncArchitecturalExtension(d);
      return;
    }
    const oldX = d.x,
      oldZ = d.z,
      p = this.clampToRoom(this.selected, d.x, d.z),
      dx = p.x - oldX,
      dz = p.z - oldZ;
    d.x = p.x;
    d.z = p.z;
    this.selected.position.set(d.x, d.y ?? 0, d.z);
    if (SUPPORT_KINDS.has(d.kind))
      for (const child of this.data.filter((x) => x.supportId === d.id)) {
        child.x += dx;
        child.z += dz;
        this.items.get(child.id)?.position.set(child.x, child.y ?? 0, child.z);
      }
  }
  private findData() {
    return this.data.find((x) => x.id === this.selected?.userData.itemId);
  }
  private modify(n: number) {
    const d = this.findData();
    if (!d || !this.selected) return;
    this.checkpoint();
    if (ARCHITECTURAL_KINDS.has(d.kind)) {
      const oldX = d.x,
        oldZ = d.z,
        oldRoom = this.extensionRect(d),
        oldRotation = d.rot;
      d.rot = this.doorWall(d) === "back" ? Math.PI / 2 : 0;
      this.snapDoorToWall(d, 0, 0);
      const delta = d.rot - oldRotation,
        c = Math.cos(delta),
        s = Math.sin(delta);
      if (oldRoom)
        for (const item of this.data) {
          if (
            item.id === d.id ||
            item.x < oldRoom.minX ||
            item.x > oldRoom.maxX ||
            item.z < oldRoom.minZ ||
            item.z > oldRoom.maxZ
          )
            continue;
          const x = item.x - oldX,
            z = item.z - oldZ;
          item.x = d.x + x * c + z * s;
          item.z = d.z - x * s + z * c;
          item.rot += delta;
          const group = this.items.get(item.id);
          if (group) {
            group.position.set(item.x, item.y ?? 0, item.z);
            group.rotation.y = item.rot;
          }
        }
      this.selected.position.set(d.x, 0, d.z);
      this.selected.rotation.y = d.rot;
      this.rebuildRoom();
      this.resetCamera();
      this.audio("place");
      this.changed();
      return;
    }
    d.rot += n;
    this.selected.rotation.y = d.rot;
    if (SUPPORT_KINDS.has(d.kind)) {
      const c = Math.cos(n),
        s = Math.sin(n);
      for (const child of this.data.filter((x) => x.supportId === d.id)) {
        const x = child.x - d.x,
          z = child.z - d.z;
        child.x = d.x + x * c - z * s;
        child.z = d.z + x * s + z * c;
        this.items.get(child.id)?.position.set(child.x, child.y ?? 0, child.z);
      }
    }
    this.keepSelectedInRoom();
    this.changed();
  }
  private adjustHeight(n: number) {
    const d = this.findData();
    if (!d || !this.selected) return;
    if (ARCHITECTURAL_KINDS.has(d.kind)) return;
    const oldY = d.y ?? 0,
      nextY = THREE.MathUtils.clamp(oldY + n, 0, 6),
      delta = nextY - oldY;
    if (!delta) return;
    this.checkpoint();
    d.y = nextY;
    d.supportId = undefined;
    this.selected.position.y = d.y;
    if (SUPPORT_KINDS.has(d.kind)) {
      for (const child of this.data.filter((x) => x.supportId === d.id)) {
        child.y = THREE.MathUtils.clamp((child.y ?? 0) + delta, 0, 6);
        this.items.get(child.id)?.position.set(child.x, child.y, child.z);
      }
    }
    document.querySelector("#selected-name")!.textContent =
      `${d.name} · ${d.y.toFixed(1)} high`;
    this.audio("place");
    this.changed();
  }
  private resizeSelected(n: number) {
    const d = this.findData();
    if (!d || !this.selected) return;
    this.checkpoint();
    d.scale = THREE.MathUtils.clamp((d.scale ?? 1) + n, 0.55, 1.6);
    this.selected.scale.setScalar(d.scale);
    if (SUPPORT_KINDS.has(d.kind)) {
      const top = this.supportTop(this.selected) + 0.025;
      for (const child of this.data.filter((x) => x.supportId === d.id)) {
        child.y = top;
        const g = this.items.get(child.id);
        if (g) g.position.y = top;
      }
    }
    this.keepSelectedInRoom();
    if (ARCHITECTURAL_KINDS.has(d.kind)) {
      this.rebuildRoom();
      this.resetCamera();
    }
    this.changed();
  }
  private recolor() {
    const d = this.findData();
    if (!d || !this.selected) return;
    this.checkpoint();
    d.color = PALETTE[(PALETTE.indexOf(d.color) + 1) % PALETTE.length];
    this.rebuild();
    this.changed();
  }
  private setSelectedColor(value: string) {
    const data = this.findData();
    if (!data || !this.selected) return;
    const color = Number.parseInt(value.replace("#", ""), 16);
    if (!Number.isFinite(color) || color === data.color) return;
    this.checkpoint();
    data.color = color;
    const label = this.objectLabel(data);
    this.rebuild();
    this.changed();
    this.announce(`${label} color changed to ${value.toUpperCase()}.`);
  }
  private duplicate() {
    const d = this.findData();
    if (!d) return;
    const c = CATALOG.find((x) => x.kind === d.kind)!;
    this.add(c, { ...d, id: crypto.randomUUID(), x: d.x + 0.6, z: d.z + 0.5 });
  }
  private remove() {
    const d = this.findData();
    if (!d || !this.selected) return;
    const architectural = ARCHITECTURAL_KINDS.has(d.kind);
    this.checkpoint();
    for (const child of this.data.filter((x) => x.supportId === d.id)) {
      child.supportId = undefined;
      child.y = 0;
      const g = this.items.get(child.id);
      if (g) g.position.y = 0;
    }
    this.scene.remove(this.selected);
    this.items.delete(d.id);
    this.data = this.data.filter((x) => x.id !== d.id);
    if (architectural) {
      this.rebuildRoom();
      this.clampAllToRoom();
      this.resetCamera();
    }
    this.select(undefined);
    this.renderObjectManager();
    this.audio("remove");
    this.changed();
  }
  private checkpoint() {
    this.history.push(structuredClone(this.data));
    if (this.history.length > 30) this.history.shift();
    this.future = [];
    this.updateButtons();
  }
  private undo() {
    const s = this.history.pop();
    if (!s) return;
    this.future.push(structuredClone(this.data));
    this.data = s;
    this.rebuild();
    this.changed();
  }
  private redo() {
    const s = this.future.pop();
    if (!s) return;
    this.history.push(structuredClone(this.data));
    this.data = s;
    this.rebuild();
    this.changed();
  }
  private rebuild() {
    const selectedId = this.selected?.userData.itemId;
    this.select(undefined);
    this.rebuildRoom();
    this.items.forEach((g) => this.scene.remove(g));
    this.items.clear();
    for (const d of this.data) {
      const g = this.makeItem(d);
      this.items.set(d.id, g);
      this.scene.add(g);
    }
    if (selectedId) this.select(this.items.get(selectedId));
    this.renderObjectManager();
    this.updateButtons();
  }
  private updateButtons() {
    (document.querySelector("#undo") as HTMLButtonElement).disabled =
      !this.history.length;
    (document.querySelector("#redo") as HTMLButtonElement).disabled =
      !this.future.length;
    const managerUndo = document.querySelector<HTMLButtonElement>(
      "#object-manager-undo",
    );
    if (managerUndo) managerUndo.disabled = !this.history.length;
  }
  private changed() {
    clearTimeout(this.saveTimer);
    this.setSaveState("Saving…", "saving");
    this.saveTimer = window.setTimeout(() => {
      localStorage.setItem("my-little-room-v1", JSON.stringify(this.data));
      this.setSaveState("Saved", "saved");
      const t = document.querySelector("#toast")!;
      t.classList.add("show");
      setTimeout(() => t.classList.remove("show"), 1400);
    }, 450);
    this.publish();
    this.updateButtons();
    this.syncTransformReadout();
  }
  private setSaveState(label: string, state: "saving" | "saved" | "error") {
    const status = document.querySelector<HTMLElement>("#save-state");
    if (!status) return;
    status.textContent = label;
    status.dataset.state = state;
  }
  private addEditableDefaultsOnce() {
    const migrationKey = "my-little-room-editable-fixtures-v1";
    if (localStorage.getItem(migrationKey)) return false;
    const defaults = [
      { kind: "memoryrug", x: 0.6, y: 0, z: 0.5, rot: 0 },
      {
        kind: "window",
        x: Math.min(this.roomWidth * 0.17, this.roomWidth / 2 - 2.7),
        y: 2.45,
        z: -this.roomDepth / 2 + 0.16,
        rot: 0,
      },
      {
        kind: "wallshelf",
        x: -this.roomWidth * 0.335,
        y: 4.3,
        z: -this.roomDepth / 2 + 0.5,
        rot: 0,
      },
      {
        kind: "wallframes",
        x: -this.roomWidth / 2 + 0.28,
        y: 3.3,
        z: Math.min(this.roomDepth / 2 - 1.1, this.roomDepth * 0.12),
        rot: Math.PI / 2,
      },
    ];
    for (const fixture of defaults) {
      const c = CATALOG.find((q) => q.kind === fixture.kind)!;
      this.add(c, fixture, false);
    }
    localStorage.setItem(migrationKey, "1");
    return true;
  }
  private load() {
    let loaded = false;
    try {
      const raw = localStorage.getItem("my-little-room-v1");
      const saved =
        raw === null ? null : (JSON.parse(raw) as ItemData[] | null);
      if (Array.isArray(saved)) {
        const available = saved.filter((item) =>
          CATALOG.some((catalogItem) => catalogItem.kind === item.kind),
        );
        this.data = available;
        if (available.length !== saved.length)
          localStorage.setItem("my-little-room-v1", JSON.stringify(available));
        this.rebuild();
        loaded = true;
      }
    } catch {}
    if (!loaded) {
      const starters = [
        ["bed", -3.8, -2.4],
        ["lamp", -5, -3.8],
        ["desk", 3.7, -3.8],
        ["plant", 4.8, -4.1],
        ["teddy", -1.2, 2.2],
        ["books", 2, 2.7],
      ] as const;
      for (const [kind, x, z] of starters) {
        const c = CATALOG.find((q) => q.kind === kind)!;
        this.add(c, { x, z }, false);
      }
    }
    const migrated = this.addEditableDefaultsOnce();
    this.clampAllToRoom();
    this.select(undefined);
    this.history = [];
    this.future = [];
    this.updateButtons();
    if (migrated || !loaded)
      localStorage.setItem("my-little-room-v1", JSON.stringify(this.data));
  }
  private toggleTime() {
    this.evening = !this.evening;
    this.applyTimeOfDay();
    this.saveRoomSettings();
    this.audio("chime");
    this.announce(`Lighting changed to ${this.evening ? "Evening" : "Afternoon"}.`);
  }
  private applyTimeOfDay() {
    (this.scene.background as THREE.Color).setHex(
      this.evening ? 0x313747 : 0x9fa9a1,
    );
    (this.scene.fog as THREE.Fog).color.setHex(
      this.evening ? 0x42404a : 0xb9b4a5,
    );
    if (this.keyLight) this.keyLight.intensity = this.evening ? 42 : 80;
    if (this.lampLight) this.lampLight.intensity = this.evening ? 14 : 5;
    const button = document.querySelector<HTMLButtonElement>("#time-toggle")!;
    button.textContent = this.evening
      ? "☾ Lighting: Evening"
      : "☀ Lighting: Afternoon";
    button.setAttribute("aria-pressed", String(this.evening));
    button.setAttribute(
      "aria-label",
      this.evening
        ? "Lighting: Evening. Switch to afternoon"
        : "Lighting: Afternoon. Switch to evening",
    );
  }
  private async openPhotoStudio() {
    this.surfaces.close("catalog", false);
    this.surfaces.close("room-panel", false);
    this.surfaces.close("file-panel", false);
    if (this.compactToolsQuery.matches)
      this.surfaces.close("secondary-actions", false);
    this.select(undefined);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    await this.playCameraEffect();
    await this.capturePhoto();
    this.surfaces.open(
      "photo-studio",
      document.querySelector<HTMLButtonElement>("#close-photo"),
    );
  }
  private async retakePhoto() {
    await this.playCameraEffect();
    await this.capturePhoto();
    document.querySelector<HTMLButtonElement>("#close-photo")?.focus();
  }
  private async playCameraEffect() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.audio("camera");
      return;
    }
    const shutter = document.querySelector<HTMLElement>("#camera-shutter")!;
    shutter.classList.remove("firing");
    void shutter.offsetWidth;
    shutter.classList.add("firing");
    this.audio("camera");
    await new Promise<void>((resolve) => window.setTimeout(resolve, 420));
    shutter.classList.remove("firing");
  }
  private closePhotoStudio() {
    if (!this.surfaces.isOpen("photo-studio")) return;
    this.photoCaptureId++;
    const studio = document.querySelector<HTMLElement>("#photo-studio")!;
    studio.classList.remove("busy");
    this.surfaces.close("photo-studio");
  }
  private setPhotoStatus(
    message: string,
    state: "normal" | "success" | "error" = "normal",
  ) {
    const status = document.querySelector<HTMLElement>("#photo-status")!;
    status.textContent = message;
    status.classList.toggle("success", state === "success");
    status.classList.toggle("error", state === "error");
  }
  private async capturePhoto() {
    const captureId = ++this.photoCaptureId,
      studio = document.querySelector<HTMLElement>("#photo-studio")!,
      aspect = Math.max(0.1, this.canvas.clientWidth / this.canvas.clientHeight),
      dpr = Math.min(window.devicePixelRatio || 1, 2),
      width = Math.min(
        2400,
        Math.max(900, Math.round(this.canvas.clientWidth * dpr)),
      ),
      height = Math.max(1, Math.round(width / aspect)),
      camera = this.camera.clone(),
      renderTarget = new THREE.WebGLRenderTarget(width, height, {
        depthBuffer: true,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      }),
      previousTarget = this.renderer.getRenderTarget(),
      pixels = new Uint8Array(width * height * 4);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    renderTarget.samples = 4;
    renderTarget.texture.colorSpace = THREE.SRGBColorSpace;
    studio.classList.add("busy");
    studio.setAttribute("aria-busy", "true");
    document
      .querySelectorAll<HTMLButtonElement>(".photo-actions button")
      .forEach((button) => (button.disabled = true));
    this.setPhotoStatus("Developing the photo…");
    try {
      this.renderer.setRenderTarget(renderTarget);
      this.renderer.clear();
      this.renderer.render(this.scene, camera);
      this.renderer.readRenderTargetPixels(
        renderTarget,
        0,
        0,
        width,
        height,
        pixels,
      );
      const output = document.createElement("canvas");
      output.width = width;
      output.height = height;
      const context = output.getContext("2d")!,
        image = context.createImageData(width, height),
        rowLength = width * 4;
      for (let y = 0; y < height; y++)
        image.data.set(
          pixels.subarray(
            (height - y - 1) * rowLength,
            (height - y) * rowLength,
          ),
          y * rowLength,
        );
      context.putImageData(image, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) =>
        output.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error("Photo encoding failed")),
          "image/png",
        ),
      );
      if (captureId !== this.photoCaptureId) return;
      if (this.photoUrl) URL.revokeObjectURL(this.photoUrl);
      this.photoBlob = blob;
      this.photoUrl = URL.createObjectURL(blob);
      const preview =
        document.querySelector<HTMLImageElement>("#photo-preview")!;
      preview.src = this.photoUrl;
      preview.alt = `Current room view of ${this.cleanRoomName(this.roomName)}`;
      await preview.decode().catch(() => {});
      this.setPhotoStatus(
        `Current view captured · ${width} × ${height} PNG`,
        "success",
      );
    } catch (error) {
      console.error("Could not create room photo", error);
      this.setPhotoStatus(
        "The photo could not be prepared. Please try again.",
        "error",
      );
    } finally {
      this.renderer.setRenderTarget(previousTarget);
      renderTarget.dispose();
      if (captureId === this.photoCaptureId) {
        studio.classList.remove("busy");
        studio.removeAttribute("aria-busy");
        document
          .querySelectorAll<HTMLButtonElement>(".photo-actions button")
          .forEach((button) => (button.disabled = false));
      }
    }
  }
  private photoFilename() {
    const slug = this.cleanRoomName(this.roomName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 42);
    return `${slug || "my-little-room"}-room-photo.png`;
  }
  private downloadPhoto() {
    if (!this.photoBlob || !this.photoUrl) return;
    const link = document.createElement("a");
    link.href = this.photoUrl;
    link.download = this.photoFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
    this.setPhotoStatus("Photo downloaded—ready to share.", "success");
  }
  private async sharePhoto() {
    if (!this.photoBlob) return;
    const file = new File([this.photoBlob], this.photoFilename(), {
        type: "image/png",
      }),
      shareData: ShareData = {
        title: this.cleanRoomName(this.roomName),
        text: "A little room of my own ✨",
        files: [file],
      };
    if (
      !navigator.share ||
      (navigator.canShare && !navigator.canShare(shareData))
    ) {
      this.downloadPhoto();
      this.setPhotoStatus(
        "Sharing is not available in this browser, so the photo was downloaded instead.",
        "success",
      );
      return;
    }
    try {
      await navigator.share(shareData);
      this.setPhotoStatus("Shared successfully.", "success");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        this.setPhotoStatus("Share cancelled. Your photo is still ready.");
        return;
      }
      this.setPhotoStatus(
        "Sharing did not open. You can still download the photo.",
        "error",
      );
    }
  }
  private isFirstPersonMovementKey(code: string) {
    return [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowLeft",
      "ArrowDown",
      "ArrowRight",
    ].includes(code);
  }
  private bindFirstPersonControls() {
    window.addEventListener("keyup", (event) => {
      if (this.isFirstPersonMovementKey(event.code))
        this.firstPersonInputs.delete(event.code);
    });
    this.canvas.addEventListener("pointerdown", (event) => {
      if (!this.firstPerson || event.button > 0) return;
      event.preventDefault();
      this.firstPersonLook = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener("pointermove", (event) => {
      if (
        !this.firstPerson ||
        !this.firstPersonLook ||
        this.firstPersonLook.pointerId !== event.pointerId
      )
        return;
      const sensitivity = event.pointerType === "touch" ? 0.006 : 0.0045,
        dx = event.clientX - this.firstPersonLook.x,
        dy = event.clientY - this.firstPersonLook.y;
      this.firstPersonYaw -= dx * sensitivity;
      this.firstPersonPitch = THREE.MathUtils.clamp(
        this.firstPersonPitch - dy * sensitivity,
        -Math.PI * 0.47,
        Math.PI * 0.47,
      );
      this.firstPersonLook.x = event.clientX;
      this.firstPersonLook.y = event.clientY;
      this.applyFirstPersonLook();
    });
    const finishLook = (event: PointerEvent) => {
      if (this.firstPersonLook?.pointerId === event.pointerId)
        this.firstPersonLook = undefined;
    };
    window.addEventListener("pointerup", finishLook);
    window.addEventListener("pointercancel", finishLook);
    this.canvas.addEventListener("lostpointercapture", finishLook);
    this.canvas.addEventListener(
      "wheel",
      (event) => {
        if (!this.firstPerson) return;
        event.preventDefault();
        this.setFirstPersonFov(this.camera.fov + Math.sign(event.deltaY) * 4);
      },
      { passive: false },
    );
    const touchCodes: Record<string, string> = {
      forward: "TouchForward",
      left: "TouchLeft",
      back: "TouchBack",
      right: "TouchRight",
    };
    document
      .querySelectorAll<HTMLButtonElement>("[data-walk]")
      .forEach((button) => {
        const code = touchCodes[button.dataset.walk ?? ""];
        const release = () => {
          this.firstPersonInputs.delete(code);
          button.classList.remove("pressed");
        };
        button.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.firstPersonInputs.add(code);
          button.classList.add("pressed");
          try {
            button.setPointerCapture(event.pointerId);
          } catch {
            // Synthetic and older touch events may not create a capturable pointer.
          }
        });
        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("lostpointercapture", release);
      });
    document.querySelector<HTMLButtonElement>("#walk-zoom-in")!.onclick = () =>
      this.setFirstPersonFov(this.camera.fov - 6);
    document.querySelector<HTMLButtonElement>("#walk-zoom-out")!.onclick = () =>
      this.setFirstPersonFov(this.camera.fov + 6);
    document.querySelector<HTMLButtonElement>("#walk-height-up")!.onclick = () =>
      this.setFirstPersonHeight(
        this.firstPersonHeight + this.firstPersonHeightStep,
      );
    document.querySelector<HTMLButtonElement>("#walk-height-down")!.onclick =
      () =>
        this.setFirstPersonHeight(
          this.firstPersonHeight - this.firstPersonHeightStep,
        );
    window.addEventListener("blur", () => {
      this.firstPersonInputs.clear();
      this.firstPersonLook = undefined;
    });
  }
  private toggleFirstPerson() {
    if (this.firstPerson) this.exitFirstPerson();
    else this.enterFirstPerson();
  }
  private enterFirstPerson() {
    if (this.firstPerson) return;
    this.surfaces.close("catalog", false);
    this.surfaces.close("room-panel", false);
    this.surfaces.close("file-panel", false);
    if (this.compactToolsQuery.matches)
      this.surfaces.close("secondary-actions", false);
    this.editorSelectedId = this.selected?.userData.itemId;
    this.select(undefined);
    this.editorCameraState = {
      position: this.camera.position.clone(),
      quaternion: this.camera.quaternion.clone(),
      target: this.controls.target.clone(),
      fov: this.camera.fov,
    };
    const start = this.firstPersonStart();
    this.firstPerson = true;
    this.firstPersonYaw = 0;
    this.firstPersonPitch = -0.04;
    this.firstPersonInputs.clear();
    this.controls.enabled = false;
    this.camera.position.set(start.x, this.firstPersonHeight, start.z);
    this.camera.fov = 67;
    this.camera.updateProjectionMatrix();
    this.applyFirstPersonLook();
    document.body.classList.add("first-person");
    const button = document.querySelector<HTMLButtonElement>("#walk-toggle")!;
    this.surfaces.setPersistent("walk-hud", true);
    button.classList.add("active");
    button.textContent = "✕ Exit walk";
    button.setAttribute("aria-pressed", "true");
    this.syncFirstPersonHeightControl();
    const touchHint = document.querySelector<HTMLElement>("#walk-touch-hint");
    if (touchHint) {
      const shouldShow = matchMedia("(pointer: coarse)").matches &&
        !localStorage.getItem("my-little-room-walk-hint-v1");
      touchHint.hidden = !shouldShow;
    }
    this.announce("Walk mode. Editing is paused; press Escape to exit.");
  }
  private exitFirstPerson() {
    if (!this.firstPerson) return;
    this.firstPerson = false;
    this.firstPersonInputs.clear();
    this.firstPersonLook = undefined;
    if (this.editorCameraState) {
      this.camera.position.copy(this.editorCameraState.position);
      this.camera.quaternion.copy(this.editorCameraState.quaternion);
      this.camera.fov = this.editorCameraState.fov;
      this.camera.updateProjectionMatrix();
      this.controls.target.copy(this.editorCameraState.target);
    }
    this.controls.enabled = true;
    this.controls.update();
    document.body.classList.remove("first-person");
    const button = document.querySelector<HTMLButtonElement>("#walk-toggle")!;
    this.surfaces.setPersistent("walk-hud", false);
    button.classList.remove("active");
    button.textContent = "◎ Walk";
    button.setAttribute("aria-pressed", "false");
    document.querySelector<HTMLElement>("#walk-touch-hint")!.hidden = true;
    if (this.editorSelectedId) this.select(this.items.get(this.editorSelectedId));
    this.editorSelectedId = undefined;
    this.announce("Walk mode closed. Editor view restored.");
  }
  private applyFirstPersonLook() {
    this.camera.rotation.set(
      this.firstPersonPitch,
      this.firstPersonYaw,
      0,
      "YXZ",
    );
    this.camera.updateMatrixWorld(true);
  }
  private setFirstPersonFov(value: number) {
    if (!this.firstPerson) return;
    this.camera.fov = THREE.MathUtils.clamp(value, 28, 76);
    this.camera.updateProjectionMatrix();
  }
  private setFirstPersonHeight(value: number) {
    if (!this.firstPerson) return;
    this.firstPersonHeight = THREE.MathUtils.clamp(
      value,
      this.firstPersonMinHeight,
      this.firstPersonMaxHeight,
    );
    this.camera.position.y = this.firstPersonHeight;
    this.camera.updateMatrixWorld(true);
    this.syncFirstPersonHeightControl();
  }
  private syncFirstPersonHeightControl() {
    const output = document.querySelector<HTMLOutputElement>(
      "#walk-height-value",
    );
    if (output) output.value = `${this.firstPersonHeight.toFixed(2)} m`;
  }
  private clampFirstPersonPoint(x: number, z: number) {
    const margin = 0.38;
    let best = { x, z, distance: Infinity };
    for (const rect of this.roomRects(true)) {
      const minX = rect.minX + margin,
        maxX = rect.maxX - margin,
        minZ = rect.minZ + margin,
        maxZ = rect.maxZ - margin;
      if (minX > maxX || minZ > maxZ) continue;
      const px = THREE.MathUtils.clamp(x, minX, maxX),
        pz = THREE.MathUtils.clamp(z, minZ, maxZ),
        distance = (px - x) ** 2 + (pz - z) ** 2;
      if (distance < best.distance) best = { x: px, z: pz, distance };
    }
    return { x: best.x, z: best.z };
  }
  private firstPersonBlocked(x: number, z: number) {
    const radius = 0.32;
    for (const [id, group] of this.items) {
      const data = this.data.find((item) => item.id === id);
      if (
        !data ||
        ARCHITECTURAL_KINDS.has(data.kind) ||
        ["memoryrug", "roundrug"].includes(data.kind)
      )
        continue;
      const box = new THREE.Box3().setFromObject(group);
      if (box.max.y < 0.42 || box.min.y > 1.58) continue;
      if (
        x > box.min.x - radius &&
        x < box.max.x + radius &&
        z > box.min.z - radius &&
        z < box.max.z + radius
      )
        return true;
    }
    return false;
  }
  private firstPersonStart() {
    const rects = [...this.roomRects(false)].sort(
      (a, b) =>
        b.maxZ - a.maxZ ||
        (b.maxX - b.minX) * (b.maxZ - b.minZ) -
          (a.maxX - a.minX) * (a.maxZ - a.minZ),
    );
    for (const rect of rects) {
      for (const z of [rect.maxZ - 1, (rect.minZ + rect.maxZ) / 2])
        for (const x of [
          (rect.minX + rect.maxX) / 2,
          rect.minX + 1,
          rect.maxX - 1,
        ]) {
          const point = this.clampFirstPersonPoint(x, z);
          if (!this.firstPersonBlocked(point.x, point.z)) return point;
        }
    }
    return this.clampFirstPersonPoint(0, 0);
  }
  private updateFirstPerson(delta: number) {
    if (!this.firstPerson) return;
    if (this.surfaces.isOpen("photo-studio")) return;
    const forwardAmount =
        Number(
          this.firstPersonInputs.has("KeyW") ||
            this.firstPersonInputs.has("ArrowUp") ||
            this.firstPersonInputs.has("TouchForward"),
        ) -
        Number(
          this.firstPersonInputs.has("KeyS") ||
            this.firstPersonInputs.has("ArrowDown") ||
            this.firstPersonInputs.has("TouchBack"),
        ),
      rightAmount =
        Number(
          this.firstPersonInputs.has("KeyD") ||
            this.firstPersonInputs.has("ArrowRight") ||
            this.firstPersonInputs.has("TouchRight"),
        ) -
        Number(
          this.firstPersonInputs.has("KeyA") ||
            this.firstPersonInputs.has("ArrowLeft") ||
            this.firstPersonInputs.has("TouchLeft"),
        );
    if (!forwardAmount && !rightAmount) return;
    const length = Math.hypot(forwardAmount, rightAmount) || 1,
      speed = 3.35 * Math.min(delta, 0.05),
      forward = new THREE.Vector3(
        -Math.sin(this.firstPersonYaw),
        0,
        -Math.cos(this.firstPersonYaw),
      ),
      right = new THREE.Vector3(
        Math.cos(this.firstPersonYaw),
        0,
        -Math.sin(this.firstPersonYaw),
      ),
      movement = forward
        .multiplyScalar((forwardAmount / length) * speed)
        .add(right.multiplyScalar((rightAmount / length) * speed));
    const xStep = this.clampFirstPersonPoint(
      this.camera.position.x + movement.x,
      this.camera.position.z,
    );
    if (!this.firstPersonBlocked(xStep.x, xStep.z)) {
      this.camera.position.x = xStep.x;
      this.camera.position.z = xStep.z;
    }
    const zStep = this.clampFirstPersonPoint(
      this.camera.position.x,
      this.camera.position.z + movement.z,
    );
    if (!this.firstPersonBlocked(zStep.x, zStep.z)) {
      this.camera.position.x = zStep.x;
      this.camera.position.z = zStep.z;
    }
    this.camera.position.y = this.firstPersonHeight;
    this.camera.updateMatrixWorld(true);
  }
  private resetCamera() {
    const rects = this.roomRects(true),
      minX = Math.min(...rects.map((rect) => rect.minX)),
      maxX = Math.max(...rects.map((rect) => rect.maxX)),
      minZ = Math.min(...rects.map((rect) => rect.minZ)),
      maxZ = Math.max(...rects.map((rect) => rect.maxZ)),
      centerX = (minX + maxX) / 2,
      centerZ = (minZ + maxZ) / 2,
      scale = Math.max((maxX - minX) / 14, (maxZ - minZ) / 11);
    this.camera.position.set(
      centerX + 12 * scale,
      10 * Math.min(scale, 1.35),
      centerZ + 15 * scale,
    );
    this.controls.target.set(centerX, 2.3, centerZ);
    this.controls.update();
  }
  private audio(type: string) {
    if (type === "begin") {
      this.ambience.loop = true;
      this.ambience.volume = 0.16;
      if (!this.muted) void this.ambience.play().catch(() => {});
    }
    if (this.muted) return;
    const A = window.AudioContext || (window as any).webkitAudioContext;
    if (!A) return;
    const ctx = new A();
    if (type === "camera") {
      const length = Math.floor(ctx.sampleRate * 0.09),
        buffer = ctx.createBuffer(1, length, ctx.sampleRate),
        samples = buffer.getChannelData(0),
        source = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter(),
        gain = ctx.createGain();
      for (let i = 0; i < length; i++)
        samples[i] = (Math.random() * 2 - 1) * (1 - i / length);
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.value = 1450;
      filter.Q.value = 0.7;
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start();
      source.stop(ctx.currentTime + 0.1);
      return;
    }
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = type === "remove" ? 190 : type === "place" ? 420 : 620;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.35);
  }
  private update(d: number, e: number) {
    if (d > 0) {
      this.frameTimes.push(d * 1000);
      if (this.frameTimes.length > 120) this.frameTimes.shift();
    }
    resizeRenderer(
      this.renderer,
      this.camera,
      matchMedia("(pointer:coarse)").matches ? 1.35 : 1.7,
    );
    if (this.firstPerson) this.updateFirstPerson(d);
    else this.controls.update();
    this.updateRoomWallTransparency();
    if (this.dust) {
      this.dust.rotation.y = e * 0.015;
      this.dust.position.y = Math.sin(e * 0.2) * 0.04;
    }
    this.items.forEach((g) => {
      g.traverse((o) => {
        if (o.userData.glow) o.scale.setScalar(1 + Math.sin(e * 2) * 0.06);
        if (o instanceof THREE.LineSegments && o.userData.selectionGlow)
          (o.material as THREE.LineBasicMaterial).opacity =
            0.62 + (Math.sin(e * 4) + 1) * 0.16;
      });
    });
    this.publish();
  }
  private publish() {
    const info = this.renderer.info.render,
      ratios = this.shapeRatios(),
      frameTimeMs = this.frameTimes.length
        ? this.frameTimes.reduce((sum, value) => sum + value, 0) / this.frameTimes.length
        : 0;
    const now = performance.now();
    if (
      now - this.diagnosticsObjectsUpdatedAt >= 100 ||
      this.diagnosticsObjects.length !== this.data.length
    ) {
      const canvasRect = this.canvas.getBoundingClientRect();
      this.diagnosticsObjects = this.data.map((data) => {
        const group = this.items.get(data.id),
          source = group?.position;
        this.diagnosticsProjection
          .set(source?.x ?? data.x, source?.y ?? data.y ?? 0, source?.z ?? data.z)
          .project(this.camera);
        return {
          id: data.id,
          kind: data.kind,
          scale: data.scale ?? 1,
          screen: {
            x:
              canvasRect.left +
              ((this.diagnosticsProjection.x + 1) / 2) * canvasRect.width,
            y:
              canvasRect.top +
              ((1 - this.diagnosticsProjection.y) / 2) * canvasRect.height,
          },
        };
      });
      this.diagnosticsObjectsUpdatedAt = now;
    }
    window.__THREE_GAME_DIAGNOSTICS__ = {
      frame: (window.__THREE_GAME_DIAGNOSTICS__?.frame || 0) + 1,
      fps: frameTimeMs ? 1000 / frameTimeMs : 0,
      frameTimeMs,
      state: this.firstPerson
        ? "walking"
        : this.selected
          ? "editing"
          : "decorating",
      player: {
        position: {
          x: this.firstPerson
            ? this.camera.position.x
            : this.selected?.position.x || 0,
          y: this.firstPerson
            ? this.camera.position.y
            : this.selected?.position.y || 0,
          z: this.firstPerson
            ? this.camera.position.z
            : this.selected?.position.z || 0,
        },
      },
      camera: {
        firstPerson: this.firstPerson,
        yaw: this.firstPersonYaw,
        pitch: this.firstPersonPitch,
        fov: this.camera.fov,
        distance: this.camera.position.distanceTo(this.controls.target),
        wallOpacity: Object.fromEntries(
          this.roomWalls.map((wall) => [wall.side, wall.opacity]),
        ) as Record<RoomWallSide, number>,
      },
      room: {
        width: this.roomWidth,
        depth: this.roomDepth,
        shape: this.roomShape,
        shapeWidth: ratios.width,
        crossbarDepth: ratios.depth,
      },
      entities: { pickups: this.data.length, total: this.data.length + 1 },
      editor: {
        selectedId: this.selected?.userData.itemId ?? null,
        historyLength: this.history.length,
        futureLength: this.future.length,
        placement: this.placement
          ? {
              kind: this.placement.data.kind,
              valid: this.placement.valid,
              x: this.placement.data.x,
              z: this.placement.data.z,
            }
          : null,
        objects: this.diagnosticsObjects,
      },
      renderer: {
        calls: info.calls,
        triangles: info.triangles,
        geometries: this.renderer.info.memory.geometries,
        textures: this.renderer.info.memory.textures,
      },
    };
  }
}
