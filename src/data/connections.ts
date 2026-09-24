// Connections between components. Confidence A = the catalog names the interface (e.g. "O-Ring, Ram
// Change Cylinder to Bonnet") or a catalog figure shows it; D = inferred from arrangement and labelled as such.
import { activeCavities } from './config'
import { cat, claim } from './sources'
import type { BonnetType, BopConfig, Claim, ComponentInstance, Connection, ConnectionKind, Side } from './types'

type Edge = [string, string, ConnectionKind, Claim<string>]

const named = (item: number, desc: string): Claim<string> =>
  claim(`The catalog part name "${desc}" (item ${item}) identifies this interface.`, [cat(12, undefined, `item ${item}`)], 'A')

const shown = (page: number, what: string): Claim<string> => claim(`Shown in the catalog figure on p.${page}: ${what}.`, [cat(page)], 'A')

const inferred = (why: string): Claim<string> => claim(`Inferred, not stated in a source: ${why}.`, [cat(9)], 'D')

const namedLb = (item: string, desc: string): Claim<string> =>
  claim(`The catalog part name "${desc}" (item ${item}, large-bore shear bonnet) identifies this interface.`, [cat(18, undefined, `item ${item}`)], 'A')

const BOOSTER_LOCK = claim(
  'The standard shear locking mechanism can be installed on the outside end of the booster.',
  [cat(20, "Since the tail rod of the tandem booster has the same stroke as the BOP's operating piston, the standard shear locking mechanism can be installed on the outside end of the booster.")],
  'A',
)

function boosterEdges(p: string): Edge[] {
  const i = (n: number) => `${p}/i${String(n).padStart(2, '0')}`
  const tb = (n: number) => `${p}/tb${String(n).padStart(2, '0')}`
  const adjacent = inferred('adjacent in the tandem booster exploded view (p.21)')
  const seat = (what: string) => inferred(`seal seat not documented; drawn next to the ${what} on p.21`)
  return [
    [tb(4), i(6), 'fastened', inferred('the booster sits between the operating cylinder and the lock, which moves to the outside end of the booster (p.20)')],
    [tb(8), tb(4), 'fastened', adjacent],
    [tb(8), i(6), 'fastened', inferred('the long cap screws hold the cylinder head to the bonnet operating cylinder')],
    [tb(3), tb(4), 'mechanical', adjacent],
    [tb(6), tb(3), 'sliding', inferred('the booster piston moves inside the booster cylinder')],
    [tb(5), tb(6), 'mechanical', adjacent],
    [tb(6), i(5), 'mechanical', inferred('the booster piston is driven together with the operating piston (same stroke, p.20)')],
    [tb(1), tb(3), 'mechanical', adjacent],
    [tb(7), tb(1), 'fastened', adjacent],
    [i(7), tb(1), 'mechanical', BOOSTER_LOCK],
    [i(8), tb(5), 'mechanical', inferred('the locking screw bears on the booster tail rod, which has the operating piston stroke (p.20)')],
    [tb(9), tb(4), 'seal-interface', seat('cylinder head')],
    [tb(10), tb(4), 'seal-interface', seat('cylinder head')],
    [tb(11), tb(3), 'seal-interface', seat('cylinder')],
    [tb(12), tb(6), 'seal-interface', seat('piston')],
    [tb(13), tb(6), 'seal-interface', seat('piston')],
    [tb(14), tb(1), 'seal-interface', seat('tail rod')],
    [tb(15), tb(1), 'seal-interface', seat('tail rod')],
    [tb(16), tb(3), 'hydraulic', inferred('the quiet muffler filter is drawn on top of the booster cylinder')],
    [tb(2), tb(1), 'mechanical', inferred('pipe plug listed with the adapter plate')],
  ]
}

function bonnetEdges(p: string, type: BonnetType): Edge[] {
  const i = (n: number) => `${p}/i${String(n).padStart(2, '0')}`
  const ram = `${p}/ram-body`
  const booster = type === 'tandemBooster'
  return [
    [i(12), i(3), 'fastened', claim('Bonnet bolts hold the bonnet closed against the preventer body.', [cat(6)], 'A')],
    [i(12), 'body', 'fastened', claim('Bonnet bolts hold the bonnet closed against the preventer body.', [cat(6)], 'A')],
    [i(34), i(12), 'seal-interface', named(34, 'O-Ring, Bonnet Bolt Retainer')],
    [i(22), i(3), 'seal-interface', inferred('the bonnet seal is a face seal between bonnet and body (face seal: p.60)')],
    [i(22), 'body', 'seal-interface', inferred('the bonnet seal is a face seal between bonnet and body (face seal: p.60)')],
    [i(35), i(2), 'fastened', named(35, 'Cap Screw, Int Flange to Bonnet')],
    [i(35), i(3), 'fastened', named(35, 'Cap Screw, Int Flange to Bonnet')],
    [i(2), i(3), 'mechanical', inferred('adjacent in exploded view SD17500')],
    [i(6), i(2), 'mechanical', inferred('adjacent in exploded view SD17500')],
    ...(booster ? [] : ([[i(7), i(6), 'mechanical', inferred('adjacent in exploded view SD17500')]] as Edge[])),
    [i(13), i(7), 'fastened', named(13, 'Stud, Locking Screw Housing')],
    [i(14), i(7), 'fastened', named(14, 'Nut, Locking Screw Housing')],
    [i(14), i(13), 'fastened', inferred('nuts thread onto the housing studs')],
    [i(8), i(7), 'mechanical', named(7, 'Housing, Locking Screw')],
    ...(booster ? [] : ([[i(8), i(5), 'mechanical', inferred('the locking screw bears on the tail end of the operating piston when locked')]] as Edge[])),
    [i(5), i(6), 'sliding', shown(6, 'operating piston inside the operating cylinder')],
    [i(26), i(5), 'seal-interface', named(26, 'Lip Seal, Operating Piston')],
    [i(42), i(5), 'seal-interface', named(42, 'Wear Ring, Operating Piston')],
    [i(24), i(6), 'seal-interface', named(24, 'O-Ring, Operating Cylinder')],
    [i(25), i(5), 'seal-interface', named(25, 'O-Ring, Operating Piston Rod to Int Flg')],
    [i(25), i(2), 'seal-interface', named(25, 'O-Ring, Operating Piston Rod to Int Flg')],
    [i(20), i(5), 'seal-interface', named(20, 'Seal Ring, Connecting Rod')],
    [i(21), i(20), 'seal-interface', inferred('back-up rings support the connecting rod seal ring')],
    [i(27), i(5), 'seal-interface', named(27, 'Seal Ring, Tail Rod')],
    [i(28), i(5), 'seal-interface', inferred('wiping O-ring on the tail rod')],
    [i(18), i(5), 'seal-interface', inferred('plastic packing ring around the connecting rod')],
    [i(19), i(18), 'seal-interface', inferred('energizing ring loads the plastic packing ring')],
    [i(15), i(18), 'hydraulic', inferred('part names place the check valve in the plastic packing system')],
    [i(16), i(18), 'mechanical', inferred('part names place the screw in the plastic packing system')],
    [i(17), i(18), 'mechanical', inferred('part names place the pipe plug in the plastic packing system')],
    [i(40), i(5), 'mechanical', inferred('drawn in the connecting-rod seal stack on SD17500')],
    [i(41), i(5), 'mechanical', inferred('drawn in the connecting-rod seal stack on SD17500')],
    [i(37), i(36), 'mechanical', inferred('bleeder plug and gland are listed together')],
    [i(36), i(6), 'hydraulic', inferred('bleeder located on the operating system')],
    [i(11), i(3), 'mechanical', named(32, 'O-Ring, Ram Change Cylinder to Bonnet')],
    [i(32), i(11), 'seal-interface', named(32, 'O-Ring, Ram Change Cylinder to Bonnet')],
    [i(32), i(3), 'seal-interface', named(32, 'O-Ring, Ram Change Cylinder to Bonnet')],
    [i(31), i(11), 'seal-interface', named(31, 'O-Ring, Ram Change Cylinder to Int Flg')],
    [i(31), i(2), 'seal-interface', named(31, 'O-Ring, Ram Change Cylinder to Int Flg')],
    [i(9), i(11), 'sliding', shown(6, 'ram-change pistons inside the ram-change cylinders')],
    [i(10), i(11), 'sliding', shown(6, 'ram-change pistons inside the ram-change cylinders')],
    [i(29), i(9), 'seal-interface', named(29, 'O-Ring, Ram Change Piston to Body')],
    [i(29), 'body', 'seal-interface', named(29, 'O-Ring, Ram Change Piston to Body')],
    [i(30), i(9), 'seal-interface', named(30, 'O-Ring, Ram Change Piston Rod to Int Flg')],
    [i(30), i(2), 'seal-interface', named(30, 'O-Ring, Ram Change Piston Rod to Int Flg')],
    [i(33), i(9), 'seal-interface', named(33, 'O-Ring, Ram Change Piston')],
    [i(23), i(3), 'mechanical', inferred('ram guide pins are part of the bonnet assembly')],
    [i(23), ram, 'mechanical', inferred('guide pins guide the ram (from the part name)')],
    [i(38), i(3), 'mechanical', inferred('lifting eye position is illustrative')],
    [ram, i(5), 'mechanical', shown(6, 'the connecting rod of the operating piston ends at the ram')],
    [`${p}/ram-packer`, ram, 'contained', shown(41, 'ram, packer and top seal form one pipe ram (sketch Sd-10825)')],
    [`${p}/ram-topSeal`, ram, 'contained', shown(41, 'ram, packer and top seal form one pipe ram (sketch Sd-10825)')],
    [`${p}/ram-bladePacker`, ram, 'contained', shown(47, 'shear ram with blade packer')],
    [`${p}/ram-sidePackers`, ram, 'contained', shown(53, 'side packers on the shear ram bodies')],
    [`${p}/ram-bladeSeals`, ram, 'contained', shown(52, 'ISR blade seals on the upper ram (SD 034603)')],
    [`${p}/i24a`, i(2), 'seal-interface', namedLb('24A', 'O-Ring, Int Flg to Bonnet Lip')],
    [`${p}/i24a`, i(3), 'seal-interface', namedLb('24A', 'O-Ring, Int Flg to Bonnet Lip')],
    ...(booster ? boosterEdges(p) : []),
    [ram, 'body', 'sliding', claim('Wellbore pressure acts on the rams inside the body.', [cat(5)], 'A')],
  ]
}

export function buildConnections(config: BopConfig, byId: Map<string, ComponentInstance>): Connection[] {
  const edges: Edge[] = []
  for (const cavity of activeCavities(config)) {
    for (const side of ['L', 'R'] as Side[]) edges.push(...bonnetEdges(`${cavity}-${side}`, config.bonnets[cavity]))
    edges.push([`${cavity}-L/ram-body`, `${cavity}-R/ram-body`, 'mechanical', shown(6, 'opposing rams meet at the bore centreline when closed')])
    for (const n of [1, 2]) {
      for (const side of ['L', 'R'] as Side[]) {
        edges.push([`port-${cavity}-${n}`, `${cavity}-${side}/i06`, 'hydraulic', inferred('p.8 says the connections operate rams and bonnets; the internal routing is not documented')])
      }
    }
    for (const face of ['front', 'back']) edges.push([`outlet-${cavity}-${face}`, 'body', 'fastened', claim('Side outlets are provided beneath each set of rams.', [cat(8)], 'A')])
  }
  edges.push(['flange-studs-top', 'body', 'fastened', claim('20 studs per 13-5/8" 10K flange.', [{ sourceId: 'SRC-PAT', locator: 'row 24' }], 'C')])
  edges.push(['flange-studs-bottom', 'body', 'fastened', claim('20 studs per 13-5/8" 10K flange.', [{ sourceId: 'SRC-PAT', locator: 'row 24' }], 'C')])

  return edges
    .filter(([a, b]) => byId.has(a) && byId.has(b))
    .map(([from, to, kind, basis], idx) => ({ id: `c${idx}`, from, to, kind, basis }))
}

export function connectionsOf(id: string, connections: Connection[]): Connection[] {
  return connections.filter((c) => c.from === id || c.to === id)
}
