// Organized exploded view. The explode slider runs in two stages:
//   1. Every bonnet assembly slides straight out along its axis like a drawer, carrying its ram,
//      so the ram and packer leave the body cavity (DRAWER_TRAVEL).
//   2. Parts spread in assembly order along the axis (ram, bonnet seal, bonnet, intermediate flange,
//      cylinder, lock housing, locking screw). The piston lifts above the line, seals and small fittings
//      line up in rows above their parent part, and bolts and screws pull straight out of their holes.
// Offsets are [along the bonnet axis outward, up (away from the other cavity), toward the front], inches.

export type ExplodeOffset = [number, number, number]

/** Stage 1: distance each bonnet assembly (and its ram) slides out. Clears a closed ram from the body. */
export const DRAWER_TRAVEL = 24

/** Fraction of the slider used by stage 1. */
export const STAGE_ONE_END = 0.4

const ROW_1 = 15
const ROW_2 = 20
const ROW_PISTON = 26
const ROW_PISTON_SEALS = 34

/** Main parts along the axis. */
const CHAIN = {
  ram: 0,
  bonnet: 8,
  intFlange: 16,
  cylinder: 26,
  housing: 38,
  screw: 48,
} as const

/** Stage-2 offset per catalog item of the bonnet assembly. */
export const BONNET_LAYOUT: Record<number, ExplodeOffset> = {
  // Main chain
  3: [CHAIN.bonnet, 0, 0],
  2: [CHAIN.intFlange, 0, 0],
  6: [CHAIN.cylinder, 0, 0],
  11: [CHAIN.cylinder, 0, 0],
  7: [CHAIN.housing, 0, 0],
  8: [CHAIN.screw, 0, 0],
  // Piston lifts above the line so its rod clears the bonnet and cylinder.
  5: [10, ROW_PISTON, 0],
  26: [10, ROW_PISTON_SEALS, 0],
  42: [13, ROW_PISTON_SEALS, 0],
  // Ram-change pistons move sideways out of their cylinders.
  9: [2, 0, 12],
  10: [2, 0, -12],
  33: [2, ROW_1, 0],
  // Fasteners pull straight out of their holes.
  // Bolts stop just clear of the bonnet flange, before the intermediate flange.
  12: [19, 0, 0],
  34: [20, 0, 0],
  35: [CHAIN.intFlange + 5, 0, 0],
  13: [32, 0, 0],
  14: [CHAIN.screw, 0, 0],
  23: [-4, 0, 0],
  // Bonnet face seal floats between the ram and the bonnet.
  22: [3, 0, 0],
  // Connecting-rod seal stack: one row above the bonnet, in assembly order.
  21: [2, ROW_1, 0],
  20: [6, ROW_1, 0],
  18: [8, ROW_1, 0],
  19: [10, ROW_1, 0],
  40: [12, ROW_1, 0],
  41: [14, ROW_1, 0],
  // Intermediate-flange and cylinder seals: same row, further out.
  25: [22, ROW_1, 0],
  24: [CHAIN.cylinder, ROW_1, 0],
  // Ram-change seals: second row.
  29: [6, ROW_2, 0],
  32: [6, ROW_2, 0],
  30: [22, ROW_2, 0],
  31: [24, ROW_2, 0],
  // Tail-rod seals above the lock housing.
  27: [CHAIN.housing, ROW_1, 0],
  28: [CHAIN.housing, ROW_1, 0],
  // Small fittings lift off their parent part.
  15: [CHAIN.intFlange, 4, 0],
  16: [CHAIN.intFlange, 4, 0],
  17: [CHAIN.intFlange, 4, 0],
  36: [CHAIN.bonnet, 3, 0],
  37: [CHAIN.bonnet, 5, 0],
  38: [CHAIN.bonnet, 6, 0],
}

/**
 * Parts that sit ON TOP of their parent (top seal, blade packer, fittings, bleeder, lifting eye) always move
 * physically upward. Moving them "away from the other cavity" would push the lower-cavity ones down through
 * their own parent part.
 */
export const WORLD_UP_ITEMS = new Set([15, 16, 17, 36, 37, 38])
export const WORLD_UP_RAM_PARTS = new Set(['topSeal', 'bladePacker'])

/** Stage-2 offset per ram part. */
export const RAM_LAYOUT: Record<string, ExplodeOffset> = {
  body: [CHAIN.ram, 0, 0],
  packer: [-4, 0, 0],
  topSeal: [CHAIN.ram, 6, 0],
  bladePacker: [-3, 5, 0],
  sidePackers: [-4, 0, 0],
}

/** How far the floor drops at full explode so rows below the lower bonnets stay above it. */
export const FLOOR_DROP = 50

/** Stage 2 also pulls the upper and lower assemblies of a double apart vertically, so their rows do not mix. */
export const CAVITY_SPREAD = 16
