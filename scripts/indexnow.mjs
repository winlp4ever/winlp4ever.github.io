// Tell IndexNow (Bing, Yandex and others; Google doesn't use it) which URLs changed in a deploy.
// Usage: node scripts/indexnow.mjs <changed or deleted files...>   or   node scripts/indexnow.mjs --all
// Changed and deleted posts are submitted with the home page (a deleted post's 404 tells engines to drop it).
// Drafts are skipped. A failure only warns, so it never blocks a deploy.
import { readdirSync, readFileSync, existsSync } from 'node:fs'

const SITE = 'https://quanglee.dev'
const key = readdirSync('public').find((f) => /^[0-9a-f]{32}\.txt$/.test(f))?.slice(0, -4)
if (!key) { console.log('::warning::no IndexNow key file in public/'); process.exit(0) }

const frontmatter = (file) => readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ''
const args = process.argv.slice(2)
const files = args[0] === '--all' ? readdirSync('src/content/posts').map((f) => `src/content/posts/${f}`) : args
const urls = files
  .map((f) => f.match(/^src\/content\/posts\/(.+)\.md$/)?.[1])
  .filter(Boolean)
  .filter((slug) => {
    const file = `src/content/posts/${slug}.md`
    return !existsSync(file) || !/^draft:\s*true/m.test(frontmatter(file))
  })
  .map((slug) => `${SITE}/blog/${slug}/`)
if (!urls.length) { console.log('no published post changed, nothing to submit'); process.exit(0) }
urls.push(`${SITE}/`)

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/${key}.txt`, urlList: urls }),
}).catch((e) => ({ status: 0, statusText: e.message }))
// 200 = accepted, 202 = accepted while the key is being checked
if (res.status === 200 || res.status === 202) console.log(`IndexNow ${res.status}:`, urls.join(' '))
else console.log(`::warning::IndexNow returned ${res.status} ${res.statusText}`)
