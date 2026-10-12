// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { readdirSync, readFileSync } from 'node:fs'

// last change of each post (frontmatter `updated`, else `date`), so crawlers can tell new and edited posts apart
const POSTS = Object.fromEntries(
  readdirSync('./src/content/posts')
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const fm = readFileSync(`./src/content/posts/${f}`, 'utf8').split('---')[1] ?? ''
      const d = (fm.match(/^updated:\s*(\S+)/m) ?? fm.match(/^date:\s*(\S+)/m) ?? [])[1]
      return [`/blog/${f.slice(0, -3)}/`, d?.replace(/['"]/g, '')]
    }),
)
const NEWEST = Object.values(POSTS).filter(Boolean).sort().at(-1)

export default defineConfig({
  site: 'https://quanglee.dev',
  // every page is served as /path/ on GitHub Pages; links and canonicals use the same form
  trailingSlash: 'always',
  integrations: [
    sitemap({
      serialize(item) {
        const path = new URL(item.url).pathname
        // the home page changes whenever a post does
        const d = POSTS[path] ?? (path === '/' ? NEWEST : undefined)
        if (d) item.lastmod = new Date(d).toISOString()
        return item
      },
    }),
  ],
  // the GLM-5.3 vs V4 Flash post was replaced by the family comparison
  redirects: {
    '/blog/glm-5-3-vs-deepseek-v4-flash/': '/blog/deepseek-v4-1-vs-glm-5-3/',
  },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
    // single $ is money on this blog, not math: only $$…$$ is parsed as LaTeX
    remarkPlugins: [[remarkMath, { singleDollarTextMath: false }]],
    rehypePlugins: [rehypeKatex],
  },
})
