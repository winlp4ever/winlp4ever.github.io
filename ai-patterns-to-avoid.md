# AI patterns to avoid

This is the writing guide for every post, caption, description and PR body in this repo. It started as a generic checklist. Since then we've added the patterns that got our own drafts sent back, with the real sentences that failed.

These are mostly defaults to break, not hard bans. One dash or one rhetorical question in a piece is fine. A draft reads as machine-written when the same few moves repeat and every sentence has the same rhythm.

A grep finds dashes and crutch words, but it won't catch most of what gets drafts rejected. The full pass at the end of this doc covers those, so do both.

---

## The 60-second check

1. Search for `—` and `–`. Replace connector dashes with a comma, colon, period or parentheses.
2. Search for the crutch words in section 6. Vary any word that shows up three or more times.
3. Read the first sentence of every paragraph out loud. If they all have the same shape, change some.
4. Find every "not X, but Y", "X, not Y" and "rather than". Cut most of them.
5. Read the last line of each section. If it's a neat summary or a lone one-liner, delete it or fold it in.
6. Search for trailing tags: `honestly`, `basically`, `exactly`, `though`, `I guess`, `I know`. Keep one or two in the whole piece.
7. Search for `?`. Every question outside a quote needs a reason to be there.
8. Count the **bold**. Keep it for terms being defined.
9. Ask whether a person would say each sentence, or whether it's "writing".

---

## 1. Em-dashes as connectors

The most recognisable tell. AI uses the em-dash to glue clauses together and drop in asides.

- ✗ "with more power come more security nightmares — and it only gets worse"
- ✓ "with more power come more security nightmares." Start a new sentence, or use a comma, colon or parentheses.

The same goes for en-dashes used as connectors. In our house style even date ranges avoid them.

---

## 2. Antithesis ("not X, but Y")

A fake contrast set up to sound insightful. It comes in a few forms:

- "it's not about speed, it's about trust"
- "X, not Y" ("measured, not theoretical")
- "not just X, but Y"
- "X rather than Y" when Y was never on the table
- "The model never picks the next word itself. Something outside it does" (from the transformer post)
- "Models don't see letters, and they don't quite see words either. They see tokens"

State the positive fact. "Code outside the model picks a token from those probabilities."

---

## 3. Mirror constructions

Sentences whose two halves rhyme in structure, or "A is the new B" formulas. They read as clever and scan as generated.

- ✗ "the thing we most need to guard is the thing we just put in charge"
- ✗ "Fast waves tell neighbours apart. Slow waves tell the start of a long text from its end."
- ✓ break the symmetry, or make the point once

---

## 4. Punch fragments

A statement followed by fragments for drama.

- ✗ "that's what 2026 is about. not smarter agents. the locks for them."
- ✗ "Same weights, 2.4 times faster, just by picking another host."
- ✗ "One sentence, seven tokens." (as a caption opener)
- ✓ "The sentence splits into seven tokens."

One-sentence paragraphs are fine. Fragments strung together for effect are the tell.

---

## 5. Triples and anaphora

- **Rhythmic triples.** Three adjectives or three clauses where one or two would do. A real list of three things is fine, but "fast, cheap, and reliable" as a flourish isn't. Watch intros that announce "it does four things in order" and then list them in matching clauses.
- **Anaphora.** Repeated sentence openings.
  - ✗ "engineers smell it. regulators smell it too. attackers smelled it first."
  - ✗ "Not everyone…" / "Since then, every…" as a sweeping opener
  - ✓ vary the structure and say who did what

---

## 6. Crutch words

Search for each one before publishing. None is banned, but repeats are a flag.

`quietly` · `subtly` · `seamlessly` · `effortlessly` · `delve` · `dive into` / `deep dive` · `unpack` · `underscore` · `highlight` · `leverage` · `harness` · `robust` · `testament` · `landscape` · `realm` · `tapestry` · `navigate` (figurative) · `foster` · `pivotal` · `crucial` · `vital` · `myriad` · `plethora` · `boasts` · `notably` · `arguably` · `ever-evolving` · `game-changer` · `paradigm` · `holistic` · `nuanced` · `intricate` · `meticulous` · `just` · `actually` · `really`

(One draft used `quietly` seven times.)

---

## 7. Openers, signposts and transitions

- "In today's world" / "In the age of AI" / "In an era where…"
- "Enter [thing]." as a reveal
- "Here's the thing:" / "Here's the kicker:" / "There's a catch."
- "Now for the good part." / "Let's dive in" / "Buckle up"
- "We'll follow one sentence all the way through." Don't announce the tour; give it.
- "From here on, …" / "Then it all happens again."
- "Make no mistake" / "Let that sink in" / "It's worth noting that"
- "That's the whole interface." / "That's generation:" These are summary stamps after a point that was already made.
- cute subtitle framings ("A field note on…")

---

## 8. Hype

`revolutionary` · `transformative` · `cutting-edge` · `state-of-the-art` · `next-level` · `supercharge` · `unlock` · `elevate` · `empower` · `unleash` · `redefine` · `seismic shift` · `at the forefront` · `the future of X` · `the famous party trick`

Describe the thing and let the reader decide it matters.

---

## 9. Hedging and disclaimers

- "It's important to note that…", "That said,", "It's worth mentioning"
- Both-sidesing every claim
- Qualifying everything into mush ("somewhat", "arguably", "in many cases")
- **Throat-clearing disclaimers.** ✗ "I didn't run benchmarks myself." Just list the sources: "The numbers below come from the vendors' model cards, four independent leaderboards and … as of 6 October 2026."

Hedge only where the evidence makes you.

---

## 10. Structure and formatting

- **Uniform paragraphs.** Every paragraph three or four sentences long. Mix short ones with longer runs.
- **Bold-lead bullets everywhere.** The "**Term**: one sentence" pattern for the whole piece.
- **The tidy close.** Ending every section, and the piece, with a restatement. ✗ "The shape stays the one you've seen though. Tokens become vectors, the vectors look at each other, think for a bit, and vote on the next token."
- **Recap sections.** "Key takeaways" blocks repeat what the reader just read.
- **Parallel heading sets.** "what it costs / where it wins / what it can't do" sounds like a template. Headings should name the topic plainly, in lowercase: "word order", "sampling", "the residual stream".
- **Title Case** headings. House style is lowercase.
- **Emoji** used to fake warmth.

---

## 11. Trailing tags

Filler words tacked onto the end of a sentence to sound casual: `honestly`, `basically`, `exactly`, `really`, `though`, `I guess`, `I know`, `or something`. One or two in a piece is human. More than that is a costume.

- ✗ "Saved by a bug in the malware, basically."
- ✗ "The shape stays the one you've seen though."

---

## 12. Section-ending drops

A short line that sounds profound, placed at the end of a section.

- ✗ "The agents are already inside the building."
- ✗ "That's how a checkbox turns into a category."
- ✗ "…because from here on the model is doing geometry on meanings."
- ✓ fold the point into the paragraph, or end the section on a concrete detail: a number, a name, a link.

---

## 13. Escalation and teasers

Lines that announce that the next sentence matters instead of letting it matter.

- "here's the uncomfortable part", "and it gets worse", "the brutal one is", "and here's the part that's easy to miss"
- ✗ "that column is the one to stare at"
- ✗ "that last part changes everything"
- ✗ "it's just physics"

Cut the announcement and keep the sentence.

---

## 14. Questions

- **Asked and answered.** ✗ "So how does a token decide where to look? It turns its vector into…" ✓ "To get those weights, each token makes three smaller vectors."
- **Question titles and headings.** ✗ "is X worth nine times the price?" ✗ "## where am I?"
- **Question descriptions.** ✗ "Every chatbot you've talked to runs one small question in a loop, what comes next?"
- **Definitions written as questions.** ✗ "query: what am I looking for?" ✓ "query: describes what the token is looking for"

---

## 15. Bolding for drama

A run of bold numbers reads like a pitch deck.

- ✗ "**90% over-permissioned** … **88% of orgs** … **45 to 1**"
- ✓ bold a term where it's defined (**tokens**, **embedding**). Leave numbers plain.

---

## 16. Reveal framings and thesis formulas

Prose that performs insight instead of stating it.

- ✗ "what the launch posts don't tell you", "which nobody mentions"
- ✗ "the question I wanted answered is what…"
- ✗ "X tells a story Y hides"
- ✗ "how close they get depends on X, and what they cost depends on Y". A thesis built on "X depends on Y" says nothing yet. Give the numbers: "On short, tool-driven work the best of these open models score about the same as Opus 5.5…"
- ✗ "Nobody tells them what to look for, yet some end up with patterns you can put a name on."
- ✗ "if I had to keep a single picture of a transformer it would be this one"

---

## 17. Jokes and personification

Cute lines that turn up because the paragraph "needed" a closer.

- ✗ "High temperature flattens it until the cat explodes."
- ✗ "watch `it` change its mind"
- ✗ "it's where each token chews on what it just heard"
- ✓ say what happens: "unlikely tokens get picked more often and the text drifts off topic"

One honest joke in a piece is fine. A joke on every section is the pattern.

---

## 18. "From X to Y" and ladders

- **"From X to Y"** as a stock arc: "from a checkbox to a category"
- **Escalating examples** where each one tops the last ("A did it. B did too. C did it first.")
- **Listicle framings:** "Quick tour", "A quick recap"

---

## What's fine

- one em-dash in a piece, where it's the right mark
- a real list of three
- a question that earns its place
- loose grammar and comma splices that match a casual voice
- starting a sentence with "and", "but" or "so"
- "I" when it's true: "I set these weights by hand", "I drew the layout"

The problem is never one instance. It's the same move on repeat.

---

## House style

- lowercase headings, conversational, opinionated
- plain declarative sentences that state the fact
- concrete beats abstract. A number, a name or a source beats an adjective.
- cite real sources with dates, and flag claims that only one source makes
- vary sentence and paragraph length
- end the piece on a concrete detail or a decision you made, not a recap
- if a sentence doesn't earn its place, cut it
- write it the way you'd tell a smart friend, then tidy lightly

### Descriptions and deks

Declarative, one or two sentences, saying what the post covers. No questions, no teasers. ✓ "A walk through the parts of a transformer, from tokens to sampling, with a working figure for each step."

### Figure captions

`<b>fig N</b>` followed by what the figure shows, then a `<span class="m">` line for method or source. Say plainly what's illustrative: "I made the numbers up", "I set these weights by hand", "The ids are illustrative". The fallback paragraph describes what the figure does in full sentences, with the real numbers.

### Commits and PR bodies

Scoped Conventional Commits (`docs(post): …`). PR bodies are plain bullet lists of what changed. No Claude attribution lines.

---

## The full pass

Do this after the 60-second check, one section of the post at a time:

1. Read the first and last sentence of every paragraph. Look for set-ups (§7, §13), punchlines (§4, §12) and jokes (§17).
2. Read every section ending on its own. It should end on a fact.
3. Find every list of three and every pair of sentences with matching openings (§3, §5).
4. Read the headings together. If they sound like a set, rename them (§10).
5. Look at paragraph lengths across the piece. If they're all similar, merge or split some.
6. Check every `?` (§14) and every "depends on", "not", "rather than" and "nobody" (§2, §16).
7. Read the description, dek and captions with the same eye. They count as prose.

_When a draft gets sent back for a pattern that isn't here, add it with the sentence that failed._
