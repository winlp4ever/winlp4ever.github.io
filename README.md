# field notes

Ha-Quang Le's blog: long-form writing on AI systems, infrastructure and algorithms, where every figure is running code. Live at https://winlp4ever.github.io.

Static [Astro](https://astro.build) site, no UI framework. Hanken Grotesk for reading, Instrument Sans for headlines and JetBrains Mono for code, all self-hosted. Figures are small custom elements that load only when you scroll near them.

```sh
npm ci
npm run dev      # localhost:4321
npm run build    # static output to ./dist
```

- Writing a post: [`docs/AUTHORING.md`](docs/AUTHORING.md)
- Conventions for contributors and coding agents: [`AGENTS.md`](AGENTS.md)
- Pushing to `main` deploys to GitHub Pages.
