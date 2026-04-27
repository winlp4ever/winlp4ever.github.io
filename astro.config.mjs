// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://winlp4ever.github.io',
  integrations: [react()],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
})