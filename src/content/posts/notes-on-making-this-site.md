---
title: Notes on making this site
date: 2025-04-27
updated: 2026-10-06
description: The site, twice. A one-font page I shipped in april, then a rebuild with figures you can poke, a small green critter and a status bar.
tags: [meta, build-log, astro]
category: notes
glyph: cursor
figures: 4
---

The first version of this site went up in april. Mono only, Inconsolata, one paragraph of bio and a list of posts. I write code for work and I think on paper for everything else, and for a long time I told myself I'd start writing in public eventually. Eventually doesn't happen on its own, so I picked the most boring setup I could find, left myself nothing to fiddle with, and shipped it.

That part worked. I wrote things. Then I wrote a post about KV caching, and the most important idea in it was a diagram that needed to move. I could only describe the movement. That's what this rebuild is about.

## version one

Astro 6, one font, plain CSS, posts as markdown files in git. In the first version of this post I said the whole site was around 200 lines. I went back and counted: 543, and 213 of those were the post page alone. Off by a factor of two and a bit, which is about my usual estimate for anything.

It read fine for about a screen. After that it was the same small grey mono all the way down, and every figure was a static picture of something that wanted to be alive.

## what I wanted instead

The blogs I keep going back to are Bartosz Ciechanowski's, Sam Rose's, Red Blob Games and The Pudding. Their figures run. You drag a slider and the watch ticks, the load balancer drops requests, the hexagons rearrange. I wanted that, and I assumed it would make every page heavy.

So before designing anything, I measured. We fetched one article from each of a dozen blogs and added up the JavaScript it loads before you've scrolled anywhere.

<figure class="wide">
<site-weight data-fig data-label="fig 1 · javascript before you scroll">
<p class="fallback">A bar chart of gzipped JavaScript loaded up front by one article on each blog: emilkowal.ski 911 KB, maximeheckel.com 861, nan.fyi 416, gwern.net 403, joshwcomeau.com 286, ciechanow.ski 207, acko.net 169, redblobgames.com 62, pudding.cool 10, samwho.dev about 0. This site loads 1.3 KB before you scroll, and 15.8 KB once every figure in the transformer post has loaded.</p>
</site-weight>
<figcaption><b>fig 1</b>Initial JavaScript, gzipped, one article per site (our measurement with curl, analytics included, inline scripts not counted). Flip to "after every figure" to see this site with all nine transformer figures loaded.</figcaption>
</figure>

The surprise was the bottom of the chart. Sam Rose ships his simulations as small custom elements with almost nothing up front, and they're some of the liveliest pages on the list. The heavy ones are heavy because of the framework around the figures, not the figures. That settled most of the architecture.

Fonts are the honest exception here. Instrument Sans and JetBrains Mono come to about 98 KB of woff2 between them, which makes them the heaviest thing on any page. They get cached after the first one.

## a critter, because I can't help it

All my projects get one handmade mark. The old site had a block cursor blinking after my name, minmux has its little pixel critters, dim0 has hand-drawn underlines. This site gets a sprout.

The first draft was a space invader. It looked like it wanted to fight someone, and the second draft, a dark blob with white eyes, looked like a bomb. The third one is green, round, has blush and a two-pixel sprout, and seemed happy to be here.

<figure class="wide">
<site-critter data-fig data-label="fig 2 · the critter, layer by layer">
<p class="fallback">A 14 by 13 pixel grid fills in layer by layer: a round green body, a two-leaf sprout on top, two dark eyes with a white sparkle, pink blush on the cheeks and a small smile. Then it blinks and the sprout sways.</p>
</site-critter>
<figcaption><b>fig 2</b>The critter is 14 by 13 pixels, drawn as one SVG with separate layers so the eyes can blink and the sprout can sway.</figcaption>
</figure>

Inside the posts it shrinks to 11 pixels wide and becomes a unit of work: a token in the transformer post, a request somewhere else. Same critter, same meaning, every time.

## every figure is a function of time

Each figure is a custom element, and a timed figure has one rule: `render(t)` draws the frame at time `t` and nothing else. It doesn't remember the previous frame or step anything forward.

That one rule pays for everything around it. Playing is just `t` going up. The scrubber sets `t`. Reduced motion jumps between a few key values of `t` instead of sliding between them. And `#t=3.2` at the end of the URL renders that exact frame, which is how I check figures without sitting through them.

<figure class="wide">
<site-time data-fig data-label="fig 3 · one render(t), four callers">
<p class="fallback">A critter hops across a line in four hops. Below it, a strip of six small frames shows the same function evaluated at six different times. The animation can be played, scrubbed, or switched to reduced motion, where it jumps from one landing spot to the next.</p>
</site-time>
<figcaption><b>fig 3</b>Play it, drag the scrubber, or switch on reduced motion. All three call the same function. The strip underneath is that function called at six fixed times.</figcaption>
</figure>

It also made the one bad bug easy to find. Scroll back and forth fast enough and a figure could start its loop again before the old one had stopped. Three quick flips gave four loops running at once, so the animation went at 3.97 times its normal speed and did four times the work. Since the frame only depends on `t`, the fix was to keep one handle per figure and cancel it on pause. Back to 0.99.

## loading only what you scroll to

A post ships as HTML and CSS. The figure code waits. A loader of about 1.3 KB watches for the first figure to come within 600 px of the screen, then pulls in the shared figure runtime (2.8 KB) and that post's own module (11.7 KB for the transformer post). Read only the intro and you never download any of it.

<figure class="wide">
<site-lazy data-fig data-label="fig 4 · what loads, and when">
<p class="fallback">A long page scrolls past a viewport. The page's HTML, CSS and a small loader arrive first, 16.8 KB in total. When the area 600 pixels below the viewport touches the first figure, the figure runtime and the post's module load, adding 14.5 KB for a total of 31.2 KB.</p>
</site-lazy>
<figcaption><b>fig 4</b>Byte counts are gzipped sizes from the built transformer post. The page here is a stand-in with its first figure two screens down.</figcaption>
</figure>

Each figure also carries a plain text description of what it shows, inside the element itself. Search engines and language models read that, and so does anyone with JavaScript off. There's an RSS feed again, and an `llms.txt` that lists every post with a one-line summary, for the robots that ask nicely.

## the rest of it

Reading text is Instrument Sans now, and JetBrains Mono does everything that's a label, a number or code. The paper is a warm off-white. The top of the home page borrows from newspapers: a masthead, double rules, columns with thin lines between them.

At the bottom of every page there's a status bar that I stole from minmux. On the home page it shows how many posts are published, the commit the site was built from, how long ago it was built, and the time in Paris. On a post it turns into a reading progress bar.

React is gone. Nothing needed it.

The plan from the first version still stands: write about whatever feels worth writing. AI infra, since that's where I spend my days, small tools I'm building, drawings, football probably. The difference is that now the drawings can move.
