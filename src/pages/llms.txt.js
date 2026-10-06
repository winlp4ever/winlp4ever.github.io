import { SITE, isoDate } from '../lib/site'
import { published } from '../lib/posts'

// A plain-text map of the site for language models, per llmstxt.org
export async function GET() {
  const posts = await published()
  const lines = [
    `# ${SITE.author} · ${SITE.name}`,
    '',
    `> ${SITE.description} Every article is static HTML; interactive figures also carry a text description of what they show.`,
    '',
    '## Articles',
    '',
    ...posts.map((p) => `- [${p.data.title}](${SITE.url}/blog/${p.id}/): ${p.data.description} (${isoDate(p.data.date)})`),
    '',
    '## Elsewhere',
    '',
    `- [GitHub](${SITE.github})`,
    '- [dim0](https://dim0.net): a thinking canvas',
    '- [minmux](https://minmux.dev): a terminal for agentic coding',
    '- [kiframe](https://github.com/vcmf/kiframe): scenario to product demo video (in development)',
    '',
  ]
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
