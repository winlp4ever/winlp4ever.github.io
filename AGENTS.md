# AGENTS.md

Instructions for coding agents (and humans) working on **field notes**, Ha-Quang Le's blog at https://winlp4ever.github.io. Each post is long-form prose with live, interactive figures, and the site stays as light as a plain text page.

## Commands

```sh
npm ci                 # install (Node 22, see engines)
npm run dev            # http://localhost:4321
npm run build          # static site in ./dist (must pass before any commit)
npm run preview        # serve ./dist
npm run release        # bump version + CHANGELOG + tag (maintainer, on main only)
```

There is no test suite. `npm run build` is the gate: it type-checks content frontmatter against the schema and fails on broken imports.

## Commit rules

- Conventional Commits with a **mandatory, specific scope**: `type(scope): message`.
- Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `style`, `chore`, `ci`, `build`, `revert`.
- Scopes in use: `site` (site-wide changes), `post` (prose of a post), `figures` (figure runtime or a post's figure module), `home`, `layout`, `styles`, `seo` (rss, sitemap, llms.txt, meta), `content` (schema, collections), `deps`, `ci`, `release`.
- Message: short, imperative, lowercase, no trailing period. One logical change per commit.
- Breaking changes (URL changes, removed posts, schema changes that break old frontmatter): `feat(scope)!: …` plus a `BREAKING CHANGE:` footer.
- Writing a new post is `feat(post): …`; editing one is `docs(post): …`.
- PRs are **squash-merged**, so the PR title must follow the same format; CI checks it.

## Versioning

Semantic versioning, driven by commit types through `commit-and-tag-version` (config in `package.json` → `commit-and-tag-version`):

- `feat` → minor, `fix` / `perf` → patch, `!` / `BREAKING CHANGE` → major.
- Release only from an up-to-date `main`: `npm run release`, then `git push --follow-tags`. It updates `package.json`, writes `CHANGELOG.md`, commits `chore(release): x.y.z` and tags `vX.Y.Z`.
- Never edit `CHANGELOG.md` or the version by hand.
- Below 1.0 the tool bumps a `feat` as a patch. The first release after the field notes rebuild is cut explicitly: `npm run release -- --release-as 1.0.0`.

## Repo map

- `src/content/posts/<slug>.md`: one Markdown file per post. The filename is the URL (`/blog/<slug>/`); renaming a post is a breaking change.
- `src/content.config.ts`: frontmatter schema (title, date, updated, description, tags, category, glyph, figures, featured, math, draft).
- `src/figures/core.js`: figure runtime shared by every post (base `Figure` class, svg helpers, critter, hand-drawn shapes, `define`).
- `src/figures/<slug>.js`: that post's figures. Loaded only when the first figure nears the viewport, matched by slug.
- `src/pages/`: `index.astro` (home), `blog/[...slug].astro` (post), `rss.xml.js`, `llms.txt.js`, `404.astro`.
- `src/components/`: `Critter`, `Glyph` (the small drawing next to each post in the index), `Strip`, `StatusBar`, `Footer`, `AttentionTeaser`, `Katex`.
- `src/layouts/BaseLayout.astro`: head, meta, JSON-LD, theme bootstrap, strip, footer, status bar.
- `src/styles/global.css`: tokens (light + dark), base, status bar. `src/styles/post.css`: article layout, prose, figure chrome, the svg class vocabulary.
- `src/lib/site.ts`: site constants (name, author, `now` line, links) and date / reading-time helpers.
- `public/katex/`: KaTeX css + woff2, linked only by posts with `math: true`.
- `docs/AUTHORING.md`: how to write a post and its figures. **Read it before touching a post.**
- `docs/ai-writing-patterns-to-avoid.md`: the voice checklist. **Run its 60-second check on any prose you write.**

## Hard rules

1. **Prose first.** Every post must read completely with JavaScript off. Each figure keeps a `<p class="fallback">` that says in words what it shows; crawlers and `llms.txt` readers depend on it.
2. **Stay light.** Under 30 KB gzipped (HTML + CSS + JS) before the first figure loads; a post's figure module under ~15 KB gzipped. No UI frameworks, no charting libraries, no external fetches at runtime. React was removed on purpose.
3. **Figures are working systems**, not pictures: they compute what they show (softmax, dp tables, cost math). Say in the caption what is illustrative.
4. **`render(t)` is a pure function of time** for timeline figures. Play, scrub, reduced motion and the `#t=` / `#still` URL hashes all go through it.
5. **Colour through classes only** (`t t2 t3 sl hand`, `f-*`, `s-*`, `paint()`), so light and dark both work. One accent (green) per figure, ochre as a second at most, one hand-drawn touch per figure.
6. **Element names are prefixed per post** (`tf-`, `kv-`, `cost-`, `es-`, `lc-`, `site-`) and must be unique site-wide.
7. **Voice**: lowercase `##` headings, first person, concrete numbers, almost no em-dashes, no tidy section closers, no recap blocks. The author writes the prose; an agent edits and flags. Don't invent stats, prices or benchmarks; mark anything unverified.
8. Don't change a post's `date`. Set `updated` when the content changes meaningfully.
9. Never commit `node_modules` (a worktree symlink once got merged and wiped the install) or `dist/`.

## Verifying visual changes

Headless Chrome doesn't run `requestAnimationFrame`, so screenshots of a live page show frame 0. Use the hashes instead:

- `/blog/<slug>/#still` renders every figure at its poster frame.
- `/blog/<slug>/#t=4.2` renders every figure at exactly 4.2 s.

Check light and dark (`--blink-settings=preferredColorScheme=1|0`) and phone width. Windows narrower than ~500 px don't lay out correctly in headless Chrome, so for phone checks load the page inside a 390 px wide `<iframe>` and screenshot that.

## Design references

The visual language (palette, type, critter, status bar) is documented outside this repo in `~/workspace/blog/my-blog/STYLE.md` and `DESIGN.md`. In short: warm paper, ink, one handmade mark on a precise grid. Hanken Grotesk for reading (`--sans`), a narrowed Instrument Sans for headlines (`--display`), JetBrains Mono for labels and code (ligatures off in code).
