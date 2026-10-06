// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

export default defineConfig({
  site: 'https://winlp4ever.github.io',
  integrations: [sitemap()],
  // the GLM-5.3 vs V4 Flash post was replaced by the family comparison
  redirects: {
    '/blog/glm-5-3-vs-deepseek-v4-flash': '/blog/deepseek-v4-1-vs-glm-5-3/',
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
