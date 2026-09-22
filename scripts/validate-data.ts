// Fails the build if any dataset rule is broken (unsourced claim, hand-typed part number, dangling id).
import { allConfigs, checkAll } from '../src/data/integrity'

const errors = checkAll()
if (errors.length) {
  console.error(`Dataset validation failed with ${errors.length} error(s):`)
  for (const e of errors.slice(0, 50)) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`Dataset valid: ${allConfigs().length} configurations checked.`)
