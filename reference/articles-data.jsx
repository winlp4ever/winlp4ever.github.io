// Shared article + profile data for all variants.
// Edit here once; every artboard reflects it.
// Wrapped in an IIFE so top-level `const`s don't collide with other
// text/babel scripts (Babel transpiles all of them into the same scope).
(function () {
const PROFILE = {
  name: "Quang Nguyen",
  handle: "@qng",
  role: "Senior Software Engineer",
  location: "Berlin · ex-Amsterdam",
  blurb: "I build distributed systems and tools for developers. Currently going deep on streaming infra, building things in the open, and writing about what I learn along the way.",
  shortBlurb: "Senior engineer. Distributed systems, dev tools, streaming infra. Building in public.",
  links: [
    { label: "github", href: "#", handle: "/qng" },
    { label: "twitter", href: "#", handle: "/qng" },
    { label: "rss", href: "#", handle: "/feed.xml" },
    { label: "email", href: "#", handle: "hi@qng.dev" },
  ],
};

const ARTICLES = [
  {
    title: "Why your retry loop is probably wrong",
    date: "2026-04-12",
    dateLong: "April 12, 2026",
    year: "2026",
    tag: "distributed-systems",
    readTime: "8 min",
    excerpt: "Exponential backoff is table stakes. The interesting failures happen at the seams — between your retry policy, your circuit breaker, and the queue you forgot was buffering.",
  },
  {
    title: "Notes on building a streaming SQL engine",
    date: "2026-03-28",
    dateLong: "March 28, 2026",
    year: "2026",
    tag: "build-log",
    readTime: "14 min",
    excerpt: "Six weeks in. What I got right (the planner), what I got wrong (everything about watermarks), and the one paper that made it click.",
  },
  {
    title: "The case for boring databases",
    date: "2026-02-15",
    dateLong: "February 15, 2026",
    year: "2026",
    tag: "essay",
    readTime: "6 min",
    excerpt: "Postgres will outlive your startup. A short defense of choosing the unsexy thing.",
  },
  {
    title: "Reading the Raft paper, slowly",
    date: "2026-01-30",
    dateLong: "January 30, 2026",
    year: "2026",
    tag: "paper-notes",
    readTime: "11 min",
    excerpt: "I've referenced Raft for years without really understanding it. This is me sitting with it for a week and writing down what stuck.",
  },
  {
    title: "Build logs are the best docs",
    date: "2026-01-08",
    dateLong: "January 8, 2026",
    year: "2026",
    tag: "essay",
    readTime: "4 min",
    excerpt: "Tutorials lie. README files age. The most useful thing I've read this year was someone's git commit messages.",
  },
  {
    title: "On leaving a job you still love",
    date: "2025-12-20",
    dateLong: "December 20, 2025",
    year: "2025",
    tag: "career",
    readTime: "7 min",
    excerpt: "Six years at one company. Why I left, what I'd tell my past self, and what I'm doing next.",
  },
  {
    title: "A taxonomy of caching mistakes",
    date: "2025-11-11",
    dateLong: "November 11, 2025",
    year: "2025",
    tag: "distributed-systems",
    readTime: "10 min",
    excerpt: "I've made all of these. Stampede, thundering herd, the silent staleness, the cache that became a database.",
  },
  {
    title: "What I learned shipping a 0.1.0",
    date: "2025-10-02",
    dateLong: "October 2, 2025",
    year: "2025",
    tag: "build-log",
    readTime: "5 min",
    excerpt: "Three users. Two bugs in the README. One feature I'm proud of. Notes from the first public release.",
  },
];

const NOW_LIST = [
  "Building a streaming SQL toy in Rust",
  "Reading 'Designing Data-Intensive Applications' for the third time",
  "Writing one essay every two weeks, no excuses",
  "Berlin → Lisbon for the winter",
];

window.PROFILE = PROFILE;
window.ARTICLES = ARTICLES;
window.NOW_LIST = NOW_LIST;
})();
