import { bodyGeometry, flangeStudGeometry, outletGeometry, portGeometry } from '../geometry/body-geometry'
import type { BonnetFrame } from '../geometry/frame'
import { cavityCentres, overallHeight } from '../geometry/params'
import { bonnetAssemblies, bonnetInstances, locationLabel, ramInstances } from './build-bonnet'
import { activeCavities, DEFAULT_CONFIG } from './config'
import { buildConnections } from './connections'
import { cat, claim } from './sources'
import type { Assembly, BopConfig, CavityId, ComponentInstance, Connection, Side } from './types'

export { activeCavities, DEFAULT_CONFIG }

export interface BopDataset {
  config: BopConfig
  assemblies: Assembly[]
  components: ComponentInstance[]
  connections: Connection[]
  byId: Map<string, ComponentInstance>
}

function frameFor(config: BopConfig, cavity: CavityId, side: Side): BonnetFrame {
  const c = cavityCentres(config.stack)
  return { sign: side === 'R' ? 1 : -1, cavityY: cavity === 'upper' ? c.upper : (c.lower ?? 0) }
}

function bodyInstances(config: BopConfig): ComponentInstance[] {
  const h = overallHeight(config.stack)
  const g = bodyGeometry(config.stack)
  const base = {
    cavity: undefined,
    side: undefined,
    quantity: null,
    recommendedSpare: null,
    kits: [],
  }
  const body: ComponentInstance = {
    ...base,
    id: 'body',
    name: 'Body',
    catalogItem: 1,
    aliases: ['body', 'preventer body', 'housing', 'forging'],
    assemblyId: 'body-assembly',
    systemIds: ['structure'],
    partNumber: null,
    quantity: claim('1', [cat(12, undefined, 'item 1')], 'A'),
    functionText: [
      claim('Pressure-energized ram-type BOP body; the U BOP is described as the most widely used ram-type BOP for land, platform and subsea applications.', [cat(5), { sourceId: 'SRC-SLB-DS-2025' }], 'A'),
      claim('Side outlets up to 4-1/16" can be provided beneath each set of rams on either or both sides, as studded, open-face flange or clamp hub connections.', [cat(8)], 'A'),
    ],
    material: claim('Forged body (weights in the catalog are based on closed die forgings). Material grade not documented.', [cat(5), cat(8)], 'A'),
    documentedDimensions: [
      { label: 'Bore', claim: claim('13-5/8 in', [cat(12), { sourceId: 'SRC-SLB-WEB' }], 'A') },
      { label: 'Working pressure', claim: claim('10,000 psi', [cat(12, undefined, '10,000 psi Model II column')], 'A') },
      { label: 'Top and bottom connections', claim: claim('Type 6BX flanges are standard for 10,000 psi working pressure (API 6A / 16A)', [cat(8)], 'A') },
      { label: 'Ring gasket, 13-5/8" 10K flange', claim: claim('BX-159', [{ sourceId: 'SRC-PAT', locator: 'row 29' }, { sourceId: 'SRC-QT' }], 'C') },
      ...(config.stack === 'double'
        ? [
            { label: 'Overall height, double, flanged', claim: { ...claim('66.625 in', [{ sourceId: 'SRC-PAT', locator: 'row 4' }], 'C'), conflicts: [{ value: '66.630 in', sources: [{ sourceId: 'SRC-QT' as const }] }] } },
            { label: 'Overall length, bonnets closed', claim: { ...claim('114.125 in', [{ sourceId: 'SRC-PAT', locator: 'row 7' }], 'C'), conflicts: [{ value: '115.66 in (closed and locked)', sources: [{ sourceId: 'SRC-QT' as const }] }] } },
            { label: 'Overall length, bonnets opened', claim: { ...claim('172.750 in', [{ sourceId: 'SRC-PAT', locator: 'row 8' }], 'C'), conflicts: [{ value: '175.54 in (open and unlocked)', sources: [{ sourceId: 'SRC-QT' as const }] }] } },
            { label: 'Weight, double, standard bonnets', claim: claim('18,400 lb', [{ sourceId: 'SRC-PAT', locator: 'row 5' }], 'C') },
          ]
        : []),
    ],
    drawing: claim('Balloon 1 on SD17500 (3D view of an assembled double)', [cat(9)], 'A'),
    notes: ['The catalog prints no part number for the body ("-----").'],
    geometry: {
      tier: 'T3',
      tierNote: `Overall height ${h.value} in is ${h.tier === 'T2' ? 'from a third-party data sheet (T2)' : 'an approximation (T3)'}; the bore is the documented 13-5/8 in; all other body dimensions are approximations. Internal cavities are not cut.`,
      meshes: g.meshes,
      kinematic: 'fixed',
      explode: [0, 0, 0],
    },
  }

  const out: ComponentInstance[] = [body]
  for (const top of [true, false]) {
    const fg = flangeStudGeometry(config.stack, top)
    out.push({
      ...base,
      id: top ? 'flange-studs-top' : 'flange-studs-bottom',
      name: `Flange studs, ${top ? 'top' : 'bottom'} 13-5/8" 10K flange`,
      aliases: ['flange studs', 'studs', `${top ? 'top' : 'bottom'} flange`],
      assemblyId: 'body-assembly',
      systemIds: ['fasteners'],
      partNumber: null,
      quantity: claim('20 per flange', [{ sourceId: 'SRC-PAT', locator: 'row 24' }], 'C'),
      functionText: [],
      material: null,
      documentedDimensions: [
        { label: 'Stud size', claim: claim('1-7/8" x 17-3/4"', [{ sourceId: 'SRC-PAT', locator: 'row 23' }], 'C') },
        { label: 'Bolt torque', claim: claim('3,332 ft-lb', [{ sourceId: 'SRC-PAT', locator: 'row 25' }], 'C') },
      ],
      drawing: null,
      notes: ['Rig-up connection hardware listed by a rental company, not a Cameron catalog item. Studs are drawn shortened.'],
      geometry: { tier: 'T3', tierNote: 'Stud diameter is from SRC-PAT (T2); bolt circle and length shown are approximations.', meshes: fg.meshes, kinematic: 'fixed', explode: fg.explode },
    })
  }

  for (const cavity of activeCavities(config)) {
    for (const front of [true, false]) {
      const og = outletGeometry(config.stack, cavity, front)
      out.push({
        ...base,
        id: `outlet-${cavity}-${front ? 'front' : 'back'}`,
        name: `Side outlet 4-1/16" 10K, ${front ? 'front' : 'back'}, below ${config.stack === 'double' ? cavity + ' ' : ''}rams`,
        aliases: ['side outlet', 'outlet', 'choke', 'kill'],
        assemblyId: 'body-assembly',
        systemIds: ['structure'],
        partNumber: null,
        quantity: claim('4 on the double listed by the rental sheet', [{ sourceId: 'SRC-PAT', locator: 'row 26: (4) 4-1/16" 10K flange outlet' }], 'C'),
        functionText: [claim('Optional side outlets beneath each set of rams, same pressure rating as the vertical run.', [cat(8)], 'A')],
        material: null,
        documentedDimensions: [
          { label: 'Outlet size', claim: claim('4-1/16" 10K', [cat(8), { sourceId: 'SRC-PAT', locator: 'row 26' }], 'A') },
          { label: 'Ring gasket', claim: claim('BX-155', [{ sourceId: 'SRC-PAT', locator: 'row 30' }, { sourceId: 'SRC-QT' }], 'C') },
          { label: 'Outlet bolting', claim: claim('1-1/8" x 8-1/2", 8 per flange, 686 ft-lb', [{ sourceId: 'SRC-PAT', locator: 'rows 26-28' }], 'C') },
        ],
        drawing: claim('Visible on the SD17500 3D view', [cat(9)], 'A'),
        notes: [],
        geometry: { tier: 'T3', tierNote: 'Position below the rams is documented (p.8); size and shape are approximations.', meshes: og.meshes, kinematic: 'fixed', explode: og.explode },
      })
    }
    for (const index of [0, 1] as const) {
      const pg = portGeometry(config.stack, cavity, index)
      out.push({
        ...base,
        id: `port-${cavity}-${index + 1}`,
        name: `Hydraulic control connection ${index + 1}${config.stack === 'double' ? `, ${cavity} rams` : ''}`,
        aliases: ['hydraulic port', 'port', 'control connection', 'hydraulic connection'],
        assemblyId: 'body-assembly',
        systemIds: ['hydraulics'],
        partNumber: null,
        quantity: claim('Two connections for each set of rams', [cat(8)], 'A'),
        functionText: [claim('Hydraulic control connections operate the rams and bonnets.', [cat(8, 'Hydraulic control connections for operation of rams and bonnets are 1" NPT.')], 'A')],
        material: null,
        documentedDimensions: [{ label: 'Thread', claim: claim('1" NPT', [cat(8)], 'A') }],
        drawing: null,
        notes: ['Which connection is "open" and which is "close", and where they sit on the body, is not documented. The position shown is illustrative.'],
        geometry: { tier: 'T3', tierNote: 'Position is illustrative.', meshes: pg.meshes, kinematic: 'fixed', explode: pg.explode },
      })
    }
  }
  return out
}

export function buildBop(config: BopConfig = DEFAULT_CONFIG): BopDataset {
  const assemblies: Assembly[] = [
    { id: 'bop', name: `Cameron U BOP 13-5/8" 10,000 psi, ${config.stack}`, parentId: null, aliases: ['bop', 'preventer', 'everything'] },
    { id: 'body-assembly', name: 'Body and connections', parentId: 'bop', aliases: ['body'] },
  ]
  const components = bodyInstances(config)
  for (const cavity of activeCavities(config)) {
    for (const side of ['L', 'R'] as Side[]) {
      const f = frameFor(config, cavity, side)
      assemblies.push(...bonnetAssemblies(cavity, side, config.stack))
      components.push(...bonnetInstances(cavity, side, f, config), ...ramInstances(cavity, side, f, config))
    }
  }
  const byId = new Map(components.map((c) => [c.id, c]))
  return { config, assemblies, components, connections: buildConnections(config, byId), byId }
}

export function componentLocation(c: ComponentInstance, config: BopConfig): string | null {
  return c.cavity && c.side ? locationLabel(c.cavity, c.side, config.stack) : null
}
