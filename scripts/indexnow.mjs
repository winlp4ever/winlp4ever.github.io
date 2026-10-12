// Tell IndexNow (Bing, Yandex and others; Google doesn't use it) which URLs changed in a deploy.
// Usage: node scripts/indexnow.mjs <changed files...>
// Posts that changed are submitted with the home page. A failure only warns, so it never blocks a deploy.
import { readdirSync, readFileSync, existsSync } from 'node:fs'

const SITE = 'https://quanglee.dev'
const key = readdirSync('public').find((f) => /^[0-9a-f]{32}\.txt$/.test(f))?.slice(0, -4)
if (!key) { console.log('::warning::no IndexNow key file in public/'); process.exit(0) }

const urls = process.argv.slice(2)
  .map((f) => f.match(/^src\/content\/posts\/(.+)\.md$/)?.[1])
  .filter((slug) => slug && existsSync(`src/content/posts/${slug}.md`))
  .filter((slug) => !/^draft:\s*true/m.test(readFileSync(`src/content/posts/${slug}.md`, 'utf8').split('---')[1] ?? ''))
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
