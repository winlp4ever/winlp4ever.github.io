export const SITE = {
  url: 'https://quanglee.dev',
  name: 'field notes',
  author: 'quanglee',
  role: 'senior software engineer',
  city: 'paris',
  description:
    'Interactive, long-form writing on AI systems, infrastructure and algorithms by quanglee, senior software engineer in Paris and math, tech and AI enthusiast.',
  now: 'writing about AI and formal math',
  email: 'quang@dim0.net',
  github: 'https://github.com/winlp4ever',
  firstYear: 2025,
}

const MONTHS = ['janv', 'févr', 'mars', 'avril', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc']

// "30 avril 26", the way the old site wrote dates
export const frDate = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`

export const isoDate = (d: Date) => d.toISOString().slice(0, 10)

// reading time from the markdown source, ignoring html tags, code fences and figure fallbacks count too
export const minutes = (body = '') => {
  const words = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
  return Math.max(1, Math.round(words / 230))
}

// one list for the schema, the filter chips and the accent colours (global.css [data-cat])
export const CATEGORY_IDS = ['ai', 'code', 'games', 'notes'] as const
export type Category = (typeof CATEGORY_IDS)[number]
export const CATEGORIES: Record<Category, string> = {
  ai: 'ai systems',
  code: 'code',
  games: 'games',
  notes: 'notes',
}
