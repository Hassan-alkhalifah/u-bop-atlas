// Builds the site for GitHub Pages and publishes dist/ to the gh-pages branch.
// Usage: npm run deploy:pages   (requires git remote "origin" and push access)
import { execSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' })
const read = (cmd) => execSync(cmd).toString().trim()

const remote = read('git remote get-url origin')
const repo = remote.replace(/\.git$/, '').split('/').pop()
if (!repo) throw new Error(`Cannot read the repository name from remote ${remote}`)

run('npm run validate && npm run typecheck')
run(`npx vite build --base=/${repo}/`)

const dir = mkdtempSync(join(tmpdir(), 'gh-pages-'))
try {
  cpSync('dist', dir, { recursive: true })
  // Serve the SPA for unknown paths and skip Jekyll processing.
  cpSync(join(dir, 'index.html'), join(dir, '404.html'))
  writeFileSync(join(dir, '.nojekyll'), '')
  run('git init -q -b gh-pages', dir)
  run('git add -A', dir)
  run('git -c user.name="deploy" -c user.email="deploy@localhost" commit -q -m "Deploy site"', dir)
  run(`git push -f ${remote} gh-pages`, dir)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
console.log(`Published. Site: https://<owner>.github.io/${repo}/`)
