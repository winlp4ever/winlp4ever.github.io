# Writing a post for field notes

Posts are Markdown in `src/content/posts/<slug>.md`. Live figures are custom elements written in `src/figures/<slug>.js`. The post page loads that module only when the first figure gets near the viewport, so a post without figures ships zero figure JS.

## Frontmatter

```yaml
title: Sentence case title, no em-dashes
date: 2026-04-30
updated: 2026-10-06          # optional, shows "revised"
description: One or two plain sentences. Used as the dek, meta description, RSS and llms.txt.
tags: [ai, llm]
category: ai                 # ai | infra | algo | notes   (home page filter)
glyph: kv                    # attention | kv | cost | dp | search | cursor | versus
figures: 5                   # number of live figures
math: true                   # only if the post uses $...$ (loads KaTeX css)
featured: false              # newest featured post is the home page hero
```

## Voice

Read `ai-patterns-to-avoid.md` and run its 60-second check. The short version:

- lowercase `##` headings, conversational, first person, opinionated
- almost no em-dashes; use commas, colons, periods, parentheses
- no "not X, but Y" reflex, no tidy section-closing one-liners, no recap/TL;DR block
- concrete numbers and stories over adjectives; vary sentence length
- bold sparingly (defining a term once is fine)

## Figures

Markup inside the Markdown (raw HTML block, blank lines around it):

```html
<figure class="wide">
<kv-grow data-fig data-label="fig 2 · the cache grows">
<p class="fallback">What the figure shows, in words. Crawlers, LLMs and no-JS readers get this.</p>
</kv-grow>
<figcaption><b>fig 2</b>Caption. Say what is real and what is illustrative.</figcaption>
</figure>
```

- Element names need a hyphen and must be unique across the site: prefix them with a short post code (`tf-`, `kv-`, `cost-`, `es-`, `lc-`, `site-`).
- Number figures in order; the label and the caption number must match.
- Sidenotes: `<span class="sn">…</span>` inside a paragraph (margin note on wide screens, inline on phones).
- A callout: `<div class="note"><span class="label">rule of thumb</span>…</div>` (use rarely).

Module shape (`src/figures/<slug>.js`):

```js
import { S, H, attr, op, seg, ease, inout, lerp, clamp, softmax, pct, paint, critter, handArrow, roughLoop, drawOn, keyframes, CW, REDUCED, STILL, Figure, define } from './core.js'

class KvGrow extends Figure {
  constructor() { super(); this.duration = 12; this.loop = false; this.poster = 12 } // timeline figure
  build() { const svg = this.svgRoot(600, 300, 'aria label'); /* create elements once */ }
  label(t) { return 'step 2/4' }   // optional text next to the scrubber
  render(t) { /* set attributes for time t; pure function of t */ }
}
define({ 'kv-grow': KvGrow })
```

- Timeline figures: set `duration` (and `loop`), implement `render(t)` as a pure function of `t`. Play / pause / scrub, reduced-motion and off-screen pausing come from `Figure`.
- Interactive figures: leave `duration` at 0, build your own controls in a `<div class="fc">` with `.pill` buttons or `<input type="range">`, set `this.idleText = 'interactive'`, and use `onVisible(v)` to start.
- Draw in an SVG viewBox about 600 wide. Text sizes 12–20 in viewBox units. Mono text width is `fontSize * CW` (JetBrains Mono, 0.6em).
- Colour only through classes / CSS variables so light and dark both work: `t t2 t3 sl hand ts` for text, `f-ink f-ink2 f-ink3 f-rule f-rule2 f-bg f-panel f-green f-ochre f-red f-none` for fills, `s-ink s-ink2 s-ink3 s-rule s-green s-ochre s-red` for strokes, `paint(rect, v)` for a diverging value cell.
- One accent per figure (green), two at most (ochre). Everything else ink and grey. One hand-drawn touch (`hand` text, `handArrow`, `roughLoop`) per figure, not more.
- The critter (`critter(parent, px, cls)`) stands for a token / request / unit of work. Same meaning across posts.
- Check frames with `#t=3.2` (exact time) or `#still` (poster) in the URL.
- Keep a figure module small: no libraries, no external data fetches. Under ~15 KB gzipped per post is the target.
