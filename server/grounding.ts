// Post-response guard. Part numbers, measured values and material / seal-compound terms in the model's
// answer must appear as whole tokens in the verified corpus: the component database for the current
// configuration plus the tool results of this request. Client-supplied text never enters the corpus.
export const UNVERIFIED_MARK = '[not in verified documentation]'

const PART_NUMBER = /\b[A-Z]?\d{5,8}(?:-[0-9A-Z]{1,4}){0,4}\b/g
const MEASURE = /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:-\d+\/\d+)?\s?(?:"|in\b|inches\b|psi\b|gal\b|gallons\b|ft-?lbs?\b|lbs?\b|mm\b|bar\b|tons?\b|:1\b)/gi
// Material and elastomer vocabulary. Any of these in an answer must be backed by the corpus.
const MATERIAL_TERMS =
  /\b(?:(?:carbon|alloy|stainless|low-alloy)\s+steel|steel|aisi\s*\d{4}|\d{4}\s+steel|inconel|monel|bronze|brass|titanium|nitrile|nbr|hnbr|viton|fkm|ffkm|aflas|neoprene|polyurethane|ptfe|teflon|peek|nylon|elastomer|rubber|camlast|hardness|durometer|rockwell|brinell|heat[- ]treat(?:ed|ment)?|quench(?:ed)?|tempered|yield strength|tensile strength)\b/gi

const tokenise = (s: string) => s.toLowerCase().replace(/,(?=\d{3})/g, '').split(/[^a-z0-9./:\-]+/).map((t) => t.replace(/^[.:\-/]+|[.:\-/]+$/g, '')).filter(Boolean)

export interface GroundingResult {
  text: string
  removed: string[]
}

export function enforceGrounding(answer: string, corpus: string): GroundingResult {
  const tokens = new Set(tokenise(corpus))
  const corpusLower = corpus.toLowerCase()
  const removed: string[] = []

  const numericOk = (token: string) => {
    const numeric = token.match(/\d[\d,./-]*/)?.[0]?.replace(/,(?=\d{3})/g, '').replace(/[.\-/]+$/, '')
    return numeric !== undefined && tokens.has(numeric)
  }
  const reject = (token: string) => {
    removed.push(token.trim())
    return UNVERIFIED_MARK
  }

  let text = answer.replace(PART_NUMBER, (t) => (tokens.has(t.toLowerCase()) ? t : reject(t)))
  text = text.replace(MEASURE, (t) => (numericOk(t) ? t : reject(t)))
  text = text.replace(MATERIAL_TERMS, (t) => (corpusLower.includes(t.toLowerCase()) ? t : reject(t)))

  if (removed.length) {
    text += `\n\n(${removed.length} value${removed.length > 1 ? 's were' : ' was'} removed because ${removed.length > 1 ? 'they do' : 'it does'} not appear in the verified component database.)`
  }
  return { text, removed }
}
