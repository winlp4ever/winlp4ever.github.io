export const SITE = {
  url: 'https://winlp4ever.github.io',
  name: 'field notes',
  author: 'Ha-Quang Le',
  role: 'lead ai engineer',
  city: 'paris',
  description:
    'Interactive, long-form writing on AI systems, infrastructure and algorithms by Ha-Quang Le, lead AI engineer in Paris.',
  now: 'rewriting every post on this site',
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

export const CATEGORIES: Record<string, string> = {
  ai: 'ai systems',
  infra: 'infra',
  algo: 'algorithms',
  notes: 'notes',
}
