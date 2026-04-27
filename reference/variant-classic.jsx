// Variant 1 — Classic editorial.
// Centered narrow column, dated list, very pared-back.
// IIFE-wrapped so top-level decls don't collide across babel scripts.
(function () {
function VariantClassic() {
  const { PROFILE, ARTICLES } = window;

  // Group articles by year for the hairline separators.
  const grouped = {};
  ARTICLES.forEach(a => {
    if (!grouped[a.year]) grouped[a.year] = [];
    grouped[a.year].push(a);
  });
  const years = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div style={vcStyles.page}>
      <div style={vcStyles.col}>

        <header style={vcStyles.header}>
          <h1 style={vcStyles.name}>{PROFILE.name}</h1>
          <p style={vcStyles.tagline}>
            <em style={{ fontStyle: 'italic', fontWeight: 300 }}>
              Senior engineer writing about distributed systems,
            </em>{' '}
            <span style={{ fontWeight: 400 }}>
              developer tools, and the craft of building software in the open.
            </span>
          </p>
        </header>

        <section style={vcStyles.about}>
          <p style={vcStyles.bodyP}>
            Currently in {PROFILE.location}. I work on streaming infrastructure
            by day and chip away at smaller projects by night — most of which
            end up as posts here. I believe the best documentation is a build
            log, and that good engineering is mostly about being honest with
            yourself about what's hard.
          </p>
        </section>

        <section style={vcStyles.writing}>
          <h2 style={vcStyles.sectionLabel}>Writing</h2>

          {years.map(year => (
            <div key={year} style={vcStyles.yearBlock}>
              <div style={vcStyles.yearRow}>
                <span style={vcStyles.yearLabel}>{year}</span>
                <span style={vcStyles.yearRule} />
              </div>
              <ul style={vcStyles.list}>
                {grouped[year].map(a => (
                  <li key={a.title} style={vcStyles.listItem}>
                    <a href="#" style={vcStyles.articleLink}>
                      <span style={vcStyles.articleTitle}>{a.title}</span>
                      <span style={vcStyles.articleDate}>
                        {a.dateLong.split(',')[0]}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <footer style={vcStyles.footer}>
          <div style={vcStyles.linkRow}>
            {PROFILE.links.map((l, i) => (
              <React.Fragment key={l.label}>
                {i > 0 && <span style={vcStyles.linkSep}>·</span>}
                <a href={l.href} style={vcStyles.footerLink}>{l.label}</a>
              </React.Fragment>
            ))}
          </div>
          <p style={vcStyles.colophon}>
            Set in Fraunces. No tracking, no analytics.
          </p>
        </footer>

      </div>
    </div>
  );
}

const vcStyles = {
  page: {
    fontFamily: '"Fraunces", Georgia, serif',
    background: '#ffffff',
    color: '#111111',
    minHeight: '100%',
    padding: '88px 32px 96px',
    fontFeatureSettings: '"ss01", "ss02"',
  },
  col: {
    maxWidth: 600,
    margin: '0 auto',
  },
  header: {
    marginBottom: 48,
  },
  name: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontWeight: 500,
    fontSize: 24,
    margin: 0,
    marginBottom: 24,
    letterSpacing: '-0.01em',
    fontVariationSettings: '"opsz" 14',
  },
  tagline: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontSize: 28,
    lineHeight: 1.35,
    margin: 0,
    color: '#111',
    fontVariationSettings: '"opsz" 36',
    textWrap: 'pretty',
    letterSpacing: '-0.015em',
  },
  about: {
    marginBottom: 64,
  },
  bodyP: {
    fontSize: 17,
    lineHeight: 1.6,
    margin: 0,
    color: '#333',
    fontVariationSettings: '"opsz" 14',
    textWrap: 'pretty',
  },
  writing: {
    marginBottom: 80,
  },
  sectionLabel: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#666',
    margin: 0,
    marginBottom: 28,
  },
  yearBlock: {
    marginBottom: 36,
  },
  yearRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  yearLabel: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    color: '#999',
    letterSpacing: '0.05em',
  },
  yearRule: {
    flex: 1,
    height: 1,
    background: '#e8e8e8',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  listItem: {
    margin: 0,
  },
  articleLink: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 24,
    padding: '10px 0',
    color: '#111',
    textDecoration: 'none',
    borderBottom: '1px solid transparent',
    transition: 'border-color .15s',
  },
  articleTitle: {
    fontSize: 17,
    fontWeight: 400,
    fontVariationSettings: '"opsz" 14',
    letterSpacing: '-0.005em',
  },
  articleDate: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    color: '#999',
    flexShrink: 0,
    letterSpacing: '0.02em',
  },
  footer: {
    paddingTop: 32,
    borderTop: '1px solid #e8e8e8',
  },
  linkRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  linkSep: {
    color: '#ccc',
    fontSize: 12,
  },
  footerLink: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 12,
    color: '#666',
    textDecoration: 'none',
    letterSpacing: '0.02em',
  },
  colophon: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    color: '#aaa',
    margin: 0,
    letterSpacing: '0.02em',
  },
};

window.VariantClassic = VariantClassic;
})();
