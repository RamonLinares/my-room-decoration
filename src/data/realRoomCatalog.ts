export type RealRoomCatalogItem = {
  kind: string;
  name: string;
  category: "realroom";
  icon: string;
  note: string;
  placement: "floor" | "surface" | "wall" | "ceiling";
  defaultY?: number;
  supportHeight?: number;
};

export const REAL_ROOM_CATALOG: RealRoomCatalogItem[] = [
  { kind: "rr-balcony-curtains", name: "Balcony doors & curtains", category: "realroom", icon: "🪟", note: "Sheer white curtains from your room", placement: "wall", defaultY: 0 },
  { kind: "rr-ceiling-light", name: "Round ceiling light", category: "realroom", icon: "◉", note: "Cool white flush-mount glow", placement: "ceiling", defaultY: 4.65 },
  { kind: "rr-glass-cabinets", name: "Double glass cabinet", category: "realroom", icon: "▥", note: "Add two to recreate your paired cabinets", placement: "floor", supportHeight: 4.25 },
  { kind: "rr-slim-display", name: "Matching single glass cabinet", category: "realroom", icon: "▯", note: "Same height and depth as the double cabinet", placement: "floor", supportHeight: 4.25 },
  { kind: "rr-dresser", name: "White four-drawer dresser", category: "realroom", icon: "▤", note: "Wide handle-free storage", placement: "floor", supportHeight: 2.35 },
  { kind: "rr-tv", name: "Dresser TV setup", category: "realroom", icon: "📺", note: "Large screen, keyboard and speakers", placement: "surface" },
  { kind: "rr-framed-photo", name: "Framed desk photo", category: "realroom", icon: "🖼️", note: "A small warm wooden frame", placement: "surface" },
  { kind: "rr-armchair", name: "Cream wood armchair", category: "realroom", icon: "🪑", note: "Upholstered chair with timber arms", placement: "floor", supportHeight: 1.15 },
  { kind: "rr-standing-desk", name: "Bamboo standing desk", category: "realroom", icon: "🖥️", note: "Wide top with white lifting legs", placement: "floor", supportHeight: 1.9 },
  { kind: "rr-ergonomic-chair", name: "Mesh ergonomic chair", category: "realroom", icon: "💺", note: "Tall black mesh back and white frame", placement: "floor" },
  { kind: "rr-ultrawide-monitor", name: "Ultrawide monitor", category: "realroom", icon: "🖥️", note: "The main screen on your desk", placement: "surface" },
  { kind: "rr-laptop", name: "Silver open laptop", category: "realroom", icon: "💻", note: "An open laptop from the workstation", placement: "surface" },
  { kind: "rr-keyboard", name: "Black keyboard & mouse", category: "realroom", icon: "⌨️", note: "Compact desktop input set", placement: "surface" },
  { kind: "rr-microphone", name: "Desktop microphone", category: "realroom", icon: "🎙️", note: "Black foam microphone on a stand", placement: "surface" },
  { kind: "rr-softbox", name: "Grid softbox light", category: "realroom", icon: "🎥", note: "Glowing studio panel with fabric grid", placement: "floor" },
  { kind: "rr-camera", name: "Mirrorless camera", category: "realroom", icon: "📷", note: "Camera and lens for the monitor top", placement: "surface" },
  { kind: "rr-task-lamp", name: "Angle task lamp", category: "realroom", icon: "💡", note: "Slim white articulated desk light", placement: "surface" },
  { kind: "rr-bottles", name: "Clear water bottle", category: "realroom", icon: "🧴", note: "Place bottles individually wherever you need them", placement: "surface" },
  { kind: "rr-backpack", name: "Black work backpack", category: "realroom", icon: "🎒", note: "Soft travel bag with shoulder straps", placement: "surface" },
  { kind: "rr-air-purifier", name: "White air purifier", category: "realroom", icon: "▱", note: "Perforated tower with top fan grille", placement: "floor" },
  { kind: "rr-rolling-drawers", name: "Rolling drawer unit", category: "realroom", icon: "🗄️", note: "White workstation drawers on casters", placement: "floor", supportHeight: 1.9 },
  { kind: "rr-waste-bin", name: "White waste basket", category: "realroom", icon: "🗑️", note: "Small bin beside the desk", placement: "floor" },
  { kind: "rr-wall-ac", name: "Wall air conditioner", category: "realroom", icon: "❄️", note: "Slim white split-system unit", placement: "wall", defaultY: 4.1 },
  { kind: "rr-desk-accessories", name: "Desk tech accessories", category: "realroom", icon: "🔌", note: "Speakers, power strip and cable tray", placement: "surface" },
];

export const REAL_ROOM_KINDS = new Set(REAL_ROOM_CATALOG.map((item) => item.kind));
export const REAL_ROOM_FLOOR_ONLY_KINDS = REAL_ROOM_CATALOG.filter(
  (item) => item.placement !== "surface",
).map((item) => item.kind);
export const REAL_ROOM_SUPPORT_HEIGHTS = Object.fromEntries(
  REAL_ROOM_CATALOG.filter((item) => item.supportHeight !== undefined).map(
    (item) => [item.kind, item.supportHeight!],
  ),
) as Record<string, number>;
