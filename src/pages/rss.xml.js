import rss from '@astrojs/rss'
import { SITE } from '../lib/site'
import { published } from '../lib/posts'

export async function GET(context) {
  const posts = await published()
  return rss({
    title: `${SITE.name} · ${SITE.author}`,
    description: SITE.description,
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.description,
      link: `/blog/${p.id}/`,
      categories: p.data.tags,
    })),
  })
}
