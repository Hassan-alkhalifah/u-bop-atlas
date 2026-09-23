import { describe, expect, it } from 'vitest'
import { runLocalAssistant } from '../src/assistant/local-engine'
import { buildBop } from '../src/data/build-bop'
import { DEFAULT_CONFIG } from '../src/data/config'
import { NOT_AVAILABLE } from '../src/data/sources'
import { enforceGrounding, UNVERIFIED_MARK } from '../server/grounding'
import { checkRateLimit } from '../server/rate-limit'
import { runTool } from '../server/tools'

const ds = buildBop(DEFAULT_CONFIG)
const types = (cmds: { type: string }[]) => cmds.map((c) => c.type)

describe('offline assistant', () => {
  it('shows the operating piston', () => {
    const r = runLocalAssistant(ds, 'Show me the operating piston.')
    expect(r.commands[0]).toEqual({ type: 'selectComponent', id: 'upper-L/i05' })
    expect(r.text).toContain('2245074-01-01')
  })

  it('isolates all seals as a system', () => {
    const r = runLocalAssistant(ds, 'Isolate all seals')
    const iso = r.commands.find((c) => c.type === 'isolateComponents')
    expect(iso && iso.type === 'isolateComponents' && iso.ids.every((id) => ds.byId.get(id)!.systemIds.includes('seals'))).toBe(true)
  })

  it('explains closing from the documented basis and plays the animation', () => {
    const r = runLocalAssistant(ds, 'Explain how the BOP closes.')
    expect(r.text).toContain('Ram closing pressure closes the rams')
    expect(r.commands).toContainEqual({ type: 'playAnimation', id: 'close' })
  })

  it('shows connections of the ram', () => {
    const r = runLocalAssistant(ds, 'Show everything connected to the ram.')
    expect(types(r.commands)).toContain('showConnections')
  })

  it('explodes both left bonnets on a double', () => {
    const r = runLocalAssistant(ds, 'Explode the left bonnet assembly.')
    const ids = r.commands.flatMap((c) => (c.type === 'explodeAssembly' ? [c.assemblyId] : []))
    expect(ids).toEqual(['bonnet-upper-L', 'bonnet-lower-L'])
  })

  it('says a material is not available instead of guessing', () => {
    const r = runLocalAssistant(ds, 'What is the material of the bonnet?')
    expect(r.text).toContain(NOT_AVAILABLE)
  })

  it('reports unknown parts without inventing one', () => {
    const r = runLocalAssistant(ds, 'show me the flux capacitor')
    expect(r.commands).toEqual([])
    expect(r.text).toContain('could not find')
  })
})

describe('grounding guard', () => {
  const corpus = JSON.stringify({ partNumber: '2245074-01-01', torque: '7,500 ft-lb', gal: '5.8 gal' })
  it('keeps values present in tool results', () => {
    const g = enforceGrounding('Part 2245074-01-01 needs 5.8 gal and 7,500 ft-lb.', corpus)
    expect(g.removed).toEqual([])
  })
  it('rejects a fabricated number that is only a substring of a real one', () => {
    const g = enforceGrounding('Use 030270-01 here.', JSON.stringify({ pn: '030270-01-00-02' }))
    expect(g.removed).toEqual(['030270-01'])
  })
  it('removes material terms the corpus does not contain', () => {
    const g = enforceGrounding('The bonnet is AISI 4130 steel with a Viton seal; the rod seal is nitrile.', JSON.stringify({ material: 'Nitrile rubber' }))
    expect(g.removed).toEqual(['AISI 4130', 'steel', 'Viton'])
    expect(g.text).toContain('nitrile')
  })
  it('removes invented part numbers and measurements', () => {
    const g = enforceGrounding('Use part 123456-01 rated to 12,500 psi with a 3.25 in bore.', corpus)
    expect(g.removed).toEqual(['123456-01', '12,500 psi', '3.25 in'])
    expect(g.text).toContain(UNVERIFIED_MARK)
  })
})

describe('server tools', () => {
  it('rejects unknown ids instead of acting', () => {
    expect(runTool(ds, 'select_component', { id: 'nope' }).isError).toBe(true)
    expect(runTool(ds, 'explode_assembly', { assembly_id: 'x', amount: 1 }).isError).toBe(true)
  })
  it('returns sourced records', () => {
    const out = runTool(ds, 'get_component', { id: 'upper-L/i05' })
    expect(out.isError).toBe(false)
    expect(out.content).toContain('SRC-CAM-CAT-2014')
    expect(out.content).toContain(NOT_AVAILABLE)
  })
  it('turns viewer tools into commands', () => {
    expect(runTool(ds, 'play_animation', { animation_id: 'close' }).command).toEqual({ type: 'playAnimation', id: 'close' })
  })
})

describe('rate limit', () => {
  it('blocks after the per-minute budget', () => {
    const results = Array.from({ length: 14 }, () => checkRateLimit('test-client', 1000))
    expect(results.filter(Boolean)).toHaveLength(12)
    expect(checkRateLimit('test-client', 1000 + 61_000)).toBe(true)
  })
})

describe('offline assistant v2', () => {
  const run = (text: string, selected: string | null = null) => runLocalAssistant(ds, text, selected)
  const cmdTypes = (text: string, selected: string | null = null) => types(run(text, selected).commands)

  it('lists every command family for "help"', () => {
    const r = run('help')
    for (const word of ['Find and show', 'Explode', 'Animations', 'Questions', 'View and setup']) expect(r.text).toContain(word)
    expect(r.suggestions?.length).toBeGreaterThan(0)
  })

  it('hides a specific part, not the whole fastener system', () => {
    const r = run('hide the bonnet bolts')
    const hide = r.commands.find((c) => c.type === 'hideComponents')
    expect(hide && hide.type === 'hideComponents' && hide.ids.every((id) => id.endsWith('/i12'))).toBe(true)
  })

  it('isolates a whole system by name', () => {
    const r = run('show only the rams')
    const iso = r.commands.find((c) => c.type === 'isolateComponents')
    expect(iso && iso.type === 'isolateComponents' && iso.ids.every((id) => ds.byId.get(id)!.systemIds.includes('rams'))).toBe(true)
  })

  it('follows up on the selected part with "it"', () => {
    expect(run('hide it', 'upper-L/i05').commands).toEqual([{ type: 'hideComponents', ids: ['upper-L/i05'] }])
    expect(run('its part number', 'upper-L/i05').text).toContain('2245074-01-01')
    expect(cmdTypes('its connections', 'upper-L/i05')).toContain('showConnections')
    expect(run('hide it').text).toContain('Select a part first')
  })

  it('explodes to a percentage', () => {
    expect(run('explode 50%').commands[0]).toEqual({ type: 'setExplode', amount: 0.5 })
  })

  it('changes the configuration from words', () => {
    const blind = run('upper rams blind').commands.find((c) => c.type === 'setConfig')
    expect(blind && blind.type === 'setConfig' && blind.config.rams.upper).toEqual({ type: 'blind' })
    const pipe = run('lower rams 3 1/2 inch pipe').commands.find((c) => c.type === 'setConfig')
    expect(pipe && pipe.type === 'setConfig' && pipe.config.rams.lower).toEqual({ type: 'pipe', pipeSize: '3.500' })
    expect(run('upper rams 8 inch pipe').text).toContain('not in the catalog')
    expect(cmdTypes('single BOP')).toContain('setConfig')
  })

  it('handles view settings', () => {
    expect(run('paint red').commands).toEqual([{ type: 'setPaint', paint: 'red' }])
    expect(run('x-ray off').commands).toEqual([{ type: 'setXray', on: false }])
    expect(run('evidence mode').commands).toEqual([{ type: 'setProvenanceMode', on: true }])
  })

  it('answers list, count, spares, kit, sources and gap questions from the data', () => {
    expect(run('list parts in the upper right bonnet').text).toContain('Piston, Operating')
    expect(run('list the locking system').text).toContain('Locking Screw')
    expect(run('how many bonnet bolts').text).toContain('16 per double BOP')
    expect(run('recommended spare parts').text).toContain('Seal, Bonnet')
    expect(run('rebuild kit').text).toContain('644909-03')
    expect(run('sources').text).toContain('Cameron International Corporation')
    expect(run('what is not documented').text).toContain('Not available in verified public documentation')
  })

  it('never invents a procedure', () => {
    expect(run('how do i replace the ram packer').text).toContain(NOT_AVAILABLE)
  })

  it('plays animations from plain commands', () => {
    expect(cmdTypes('close the rams')).toContain('playAnimation')
    expect(run('open the bonnets').commands).toContainEqual({ type: 'playAnimation', id: 'bonnet-open' })
    expect(run('stop').commands).toEqual([{ type: 'stopAnimation' }])
  })

  it('suggests near matches for typos', () => {
    const r = run('show the pistn')
    expect(r.text).toContain('Did you mean')
    expect(r.suggestions?.some((s) => /piston/i.test(s))).toBe(true)
  })
})
