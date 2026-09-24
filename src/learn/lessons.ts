// Guided lessons. A lesson never states an engineering fact of its own: every fact is looked up at run time
// from the sourced dataset (component claims, animation bases, system descriptions), so it shows the same
// value, evidence level and source page as the Details panel. The step text only tells the viewer what to
// look at. Tests check that every fact resolves in the lesson's configuration.
import { animationById } from '../data/animations'
import type { BopDataset } from '../data/build-bop'
import { DEFAULT_CONFIG } from '../data/config'
import { SYSTEMS } from '../data/systems'
import type { BopConfig, Claim, SystemId } from '../data/types'
import { componentsInAssembly, type Command } from '../state/commands'

export interface Fact {
  label: string
  get: (ds: BopDataset) => Claim<string> | null
}

export interface LessonStep {
  title: string
  /** What to look at in the model. Not an engineering statement. */
  look: string
  facts: Fact[]
  /** Configuration changes for this step, applied on top of the lesson configuration. */
  config?: Partial<BopConfig>
  /** Commands run after the view is reset for this step. */
  setup: (ds: BopDataset) => Command[]
}

export interface Lesson {
  id: string
  title: string
  summary: string
  config: BopConfig
  steps: LessonStep[]
}

// ---------- Fact lookups ----------

const fn = (label: string, id: string, index = 0): Fact => ({ label, get: (ds) => ds.byId.get(id)?.functionText[index] ?? null })
const dim = (label: string, id: string, prefix: string): Fact => ({ label, get: (ds) => ds.byId.get(id)?.documentedDimensions.find((d) => d.label.startsWith(prefix))?.claim ?? null })
const pn = (label: string, id: string): Fact => ({ label, get: (ds) => ds.byId.get(id)?.partNumber ?? null })
const qty = (label: string, id: string): Fact => ({ label, get: (ds) => ds.byId.get(id)?.quantity ?? null })
const material = (label: string, id: string): Fact => ({ label, get: (ds) => ds.byId.get(id)?.material ?? null })
const kit = (label: string, id: string): Fact => ({ label, get: (ds) => ds.byId.get(id)?.kits[0] ?? null })
const anim = (label: string, id: string): Fact => ({ label, get: () => animationById(id)?.basis ?? null })
const system = (label: string, id: SystemId): Fact => ({ label, get: () => SYSTEMS[id].description })

// ---------- Command helpers ----------

const systemIds = (ds: BopDataset, id: SystemId) => ds.components.filter((c) => c.systemIds.includes(id) && c.geometry.meshes.length).map((c) => c.id)
const assemblies = (ds: BopDataset, ...ids: string[]) => ids.flatMap((id) => componentsInAssembly(ds, id))
const select = (id: string): Command[] => [{ type: 'selectComponent', id }, { type: 'focusCamera', id }]

const SHEAR_LOWER: Partial<BopConfig> = { rams: { ...DEFAULT_CONFIG.rams, lower: { type: 'sbr' } } }

export const LESSONS: Lesson[] = [
  {
    id: 'tour',
    title: 'Tour of the U BOP',
    summary: 'The main parts of a double U BOP and what each one does, from the body to the locks.',
    config: DEFAULT_CONFIG,
    steps: [
      {
        title: 'The preventer',
        look: 'This is a double U BOP: one body with two ram cavities, upper and lower. Each cavity has a bonnet on the left and on the right.',
        facts: [fn('What it is', 'body', 0), dim('Bore', 'body', 'Bore'), dim('Working pressure', 'body', 'Working pressure')],
        setup: () => [{ type: 'focusCamera', id: 'bop' }],
      },
      {
        title: 'Rams close on the pipe',
        look: 'Only the rams are shown. Watch the two rams of each cavity move in, meet at the bore and lock.',
        facts: [anim('Closing', 'close'), fn('Why the seal holds', 'upper-L/ram-body', 0)],
        setup: (ds) => [{ type: 'isolateComponents', ids: systemIds(ds, 'rams') }, { type: 'focusCamera', id: 'bop' }, { type: 'playAnimation', id: 'close' }],
      },
      {
        title: 'The operating piston',
        look: 'The upper left bonnet is exploded. The highlighted operating piston pushes its ram through the connecting rod.',
        facts: [fn('What it does', 'upper-L/i05', 0), pn('Part number', 'upper-L/i05'), dim('Fluid to close one set', 'upper-L/i05', 'Fluid to close'), dim('Closing ratio', 'upper-L/i05', 'Closing ratio')],
        setup: () => [{ type: 'explodeAssembly', assemblyId: 'bonnet-upper-L', amount: 1 }, ...select('upper-L/i05')],
      },
      {
        title: 'Manual locks',
        look: 'The locking screw sits at the outer end of each bonnet. Watch it run in after the rams close.',
        facts: [fn('Lock type', 'upper-L/i08', 0), fn('Turns', 'upper-L/i08', 1)],
        setup: () => [...select('upper-L/i08'), { type: 'playAnimation', id: 'close' }],
      },
      {
        title: 'Ram change',
        look: 'The bolts come out and the bonnets slide away from the body, bringing each ram out with them.',
        facts: [anim('Opening the bonnets', 'bonnet-open'), system('Seal work in this position', 'seals')],
        setup: () => [{ type: 'focusCamera', id: 'bop' }, { type: 'playAnimation', id: 'bonnet-open' }],
      },
      {
        title: 'Seals and spare parts',
        look: 'Only the seals and packing parts are shown, laid out around the upper left bonnet.',
        facts: [kit('Rebuild kit', 'upper-L/i20'), material('Connecting rod seal material', 'upper-L/i20'), fn('Bonnet seal', 'upper-L/i22', 0)],
        setup: (ds) => [{ type: 'isolateComponents', ids: systemIds(ds, 'seals') }, { type: 'focusCamera', id: 'bonnet-upper-L' }],
      },
    ],
  },
  {
    id: 'sealing',
    title: 'How a ram seals',
    summary: 'Ram body, packer and top seal of a pipe ram, and the variable bore packer that fits a range of pipe.',
    config: DEFAULT_CONFIG,
    steps: [
      {
        title: 'A pipe ram',
        look: 'The two upper rams are shown. The half-round cutout in each front fits the pipe size of the ram.',
        facts: [fn('Pipe ram features', 'upper-L/ram-body', 1), dim('Pipe size', 'upper-L/ram-body', 'Pipe size')],
        setup: (ds) => [{ type: 'isolateComponents', ids: assemblies(ds, 'ram-upper-L', 'ram-upper-R') }, { type: 'focusCamera', id: 'ram-upper-L' }],
      },
      {
        title: 'The packer',
        look: 'The highlighted packer runs across the front of the ram, around the pipe cutout.',
        facts: [pn('Part number', 'upper-L/ram-packer'), fn('Packer design', 'upper-L/ram-packer', 0)],
        setup: (ds) => [{ type: 'isolateComponents', ids: assemblies(ds, 'ram-upper-L', 'ram-upper-R') }, ...select('upper-L/ram-packer')],
      },
      {
        title: 'The top seal',
        look: 'The arched top seal lies on the top of the ram.',
        facts: [pn('Part number', 'upper-L/ram-topSeal'), fn('Top seal design', 'upper-L/ram-topSeal', 0)],
        setup: (ds) => [{ type: 'isolateComponents', ids: assemblies(ds, 'ram-upper-L', 'ram-upper-R') }, ...select('upper-L/ram-topSeal')],
      },
      {
        title: 'Pressure helps the seal',
        look: 'Watch the rams close. The fact below explains how wellbore pressure helps the seal.',
        facts: [fn('Pressure-energized', 'upper-L/ram-body', 0)],
        setup: (ds) => [{ type: 'isolateComponents', ids: assemblies(ds, 'ram-upper-L', 'ram-upper-R') }, { type: 'focusCamera', id: 'ram-upper-L' }, { type: 'playAnimation', id: 'close' }],
      },
      {
        title: 'Variable bore rams',
        look: 'The upper rams are now VBR-II variable bore rams. One packer covers the whole pipe size range below; the inserts drawn around the bore are illustrative.',
        config: { rams: { ...DEFAULT_CONFIG.rams, upper: { type: 'vbr', id: 'v3.5-5.875' } } },
        facts: [fn('VBR-II packer', 'upper-L/ram-packer', 0), dim('Pipe size range', 'upper-L/ram-packer', 'Pipe size range'), pn('Packer part number', 'upper-L/ram-packer')],
        setup: (ds) => [{ type: 'isolateComponents', ids: assemblies(ds, 'ram-upper-L', 'ram-upper-R') }, ...select('upper-L/ram-packer')],
      },
    ],
  },
  {
    id: 'shearing',
    title: 'Shearing options',
    summary: 'Shearing blind rams, interlocking shear rams, large-bore shear bonnets and tandem boosters.',
    config: { ...DEFAULT_CONFIG, ...SHEAR_LOWER },
    steps: [
      {
        title: 'Shearing blind rams (SBR)',
        look: 'The lower cavity has shearing blind rams. Watch the pair close.',
        facts: [fn('What they do', 'lower-L/ram-body', 0), material('Materials', 'lower-L/ram-body'), pn('Upper ram body', 'lower-L/ram-body')],
        setup: (ds) => [{ type: 'isolateComponents', ids: assemblies(ds, 'ram-lower-L', 'ram-lower-R') }, { type: 'focusCamera', id: 'ram-lower-L' }, { type: 'playAnimation', id: 'close' }],
      },
      {
        title: 'Interlocking shear rams (ISR)',
        look: 'Now the lower rams are ISR. The upper ram has a "V" front and the lower ram a matching notch.',
        config: { rams: { ...DEFAULT_CONFIG.rams, lower: { type: 'isr' } } },
        facts: [fn('Why ISR', 'lower-L/ram-body', 0), fn('The lower fish', 'lower-L/ram-body', 1), dim('Largest drill pipe', 'lower-L/ram-body', 'Largest drill pipe')],
        setup: (ds) => [{ type: 'isolateComponents', ids: assemblies(ds, 'ram-lower-L', 'ram-lower-R') }, { type: 'focusCamera', id: 'ram-lower-L' }, { type: 'playAnimation', id: 'close' }],
      },
      {
        title: 'Large-bore shear bonnets',
        look: 'The lower cavity now has large-bore shear bonnets. The operating cylinder and piston are larger than on the upper bonnets.',
        config: { bonnets: { upper: 'standard', lower: 'largeBoreShear' } },
        facts: [pn('Shear operating piston (5A)', 'lower-L/i05'), dim('Closing ratio', 'lower-L/i05', 'Closing ratio'), dim('Fluid to close one set', 'lower-L/i05', 'Fluid to close')],
        setup: () => [{ type: 'explodeAssembly', assemblyId: 'bonnet-lower-L', amount: 1 }, ...select('lower-L/i05')],
      },
      {
        title: 'Tandem boosters',
        look: 'The lower bonnets now carry tandem boosters: a second cylinder and piston between the bonnet and the lock.',
        config: { bonnets: { upper: 'standard', lower: 'tandemBooster' } },
        facts: [fn('What they add', 'lower-L/tb05', 0), fn('Where the lock goes', 'lower-L/tb05', 1), dim('Assembly part number', 'lower-L/tb03', 'Tandem booster assembly')],
        setup: () => [{ type: 'explodeAssembly', assemblyId: 'bonnet-lower-L', amount: 1 }, ...select('lower-L/tb03')],
      },
    ],
  },
  {
    id: 'bonnet',
    title: 'Anatomy of a bonnet',
    summary: 'The parts of one bonnet assembly, laid out in assembly order.',
    config: DEFAULT_CONFIG,
    steps: [
      {
        title: 'The exploded bonnet',
        look: 'The upper left bonnet is exploded in assembly order: ram, bonnet, intermediate flange, cylinder, lock housing and locking screw.',
        facts: [fn('The bonnet', 'upper-L/i03', 0), pn('Bonnet part number', 'upper-L/i03')],
        setup: () => [{ type: 'explodeAssembly', assemblyId: 'bonnet-upper-L', amount: 1 }, { type: 'focusCamera', id: 'bonnet-upper-L' }],
      },
      {
        title: 'Bonnet bolts',
        look: 'The highlighted bolts hold the bonnet to the body.',
        facts: [fn('What they do', 'upper-L/i12', 0), qty('Quantity', 'upper-L/i12'), dim('Torque (third-party sheet)', 'upper-L/i12', 'Bonnet bolt torque')],
        setup: () => [{ type: 'explodeAssembly', assemblyId: 'bonnet-upper-L', amount: 1 }, ...select('upper-L/i12')],
      },
      {
        title: 'Ram-change cylinders',
        look: 'The two ram-change cylinders run through the intermediate flange on either side of the operating cylinder.',
        facts: [fn('Purpose', 'upper-L/i11', 0), pn('Part number', 'upper-L/i11')],
        setup: () => [{ type: 'explodeAssembly', assemblyId: 'bonnet-upper-L', amount: 1 }, ...select('upper-L/i11')],
      },
      {
        title: 'Connecting rod seals',
        look: 'The seal row above the bonnet holds the connecting-rod seal stack, in assembly order.',
        facts: [material('Material', 'upper-L/i20'), pn('Seal ring part number', 'upper-L/i20'), kit('Kit', 'upper-L/i20')],
        setup: () => [{ type: 'explodeAssembly', assemblyId: 'bonnet-upper-L', amount: 1 }, ...select('upper-L/i20')],
      },
    ],
  },
]

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}

/** Configuration of a step: the lesson configuration with the step's changes applied. */
export function stepConfig(lesson: Lesson, index: number): BopConfig {
  return { ...lesson.config, ...(lesson.steps[index]?.config ?? {}) }
}
