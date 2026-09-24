import type { BopConfig, CavityId } from './types'

export const DEFAULT_CONFIG: BopConfig = {
  stack: 'double',
  rams: { upper: { type: 'pipe', pipeSize: '5.000' }, lower: { type: 'sbr' } },
  bonnets: { upper: 'standard', lower: 'standard' },
}

export function activeCavities(config: BopConfig): CavityId[] {
  return config.stack === 'double' ? ['upper', 'lower'] : ['upper']
}
