import { getCollection, type CollectionEntry } from 'astro:content'

export type Post = CollectionEntry<'posts'>

export async function published(): Promise<Post[]> {
  const all = await getCollection('posts', ({ data }) => !data.draft)
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
}

export async function drafts(): Promise<number> {
  return (await getCollection('posts', ({ data }) => data.draft)).length
}
