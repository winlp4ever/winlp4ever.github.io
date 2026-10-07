import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    updated: z.date().optional(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    category: z.enum(['ai', 'infra', 'algo', 'notes']).default('notes'),
    // small drawing used in the index; see components/Glyph.astro
    glyph: z.enum(['attention', 'kv', 'cost', 'dp', 'search', 'cursor', 'versus', 'graph', 'proof']).default('cursor'),
    // number of live figures, shown in listings
    figures: z.number().default(0),
    featured: z.boolean().default(false),
    math: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
})

export const collections = { posts }
