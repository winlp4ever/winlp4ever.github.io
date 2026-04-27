---
title: Notes on making this site
date: 2025-04-27
description: Why I built a personal site, and what's underneath it.
tags: [meta, build-log]
---

I just shipped the first version of this site. Mono only, Inconsolata, one paragraph bio. Nothing fancy.

## Why a personal site

I write code for work and I think on paper for everything else. For a long time I told myself I'd start writing in public eventually. Eventually doesn't really happen on its own. So here we are.

The plan is one post every two weeks. Topics will be all over the place — AI infra (where I spend my days), small tools I'm building, drawings, football probably. Whatever feels worth writing.

## The stack

Picked the most boring setup so I'd have nothing to fiddle with:

- Astro 6 for the static framework
- Inconsolata as the only font
- TypeScript without semicolons
- Plain CSS, no Tailwind, no component library
- Markdown for posts, committed to git

Whole site is around 200 lines including styles. Want it to stay small.

## What rendering looks like

A code block:

```ts
const profile = {
  name: 'Ha-Quang Le',
  role: 'Lead AI Engineer',
  links: ['github', 'linkedin', 'email'],
}
```

Inline code looks like `npm run dev`. Links go to places like [astro.build](https://astro.build). Lists work:

1. First item
2. Second item
   - Nested
   - Also nested
3. Third item

A blockquote:

> Building in public is mostly a way to stay honest with yourself about how messy the work actually is.

## What's next

A few half-written notes sitting in a folder. Some about retrieval at scale, some about agents and where they break. Maybe one about why football tactics and software architecture rhyme more than they should.

That's it for now.
