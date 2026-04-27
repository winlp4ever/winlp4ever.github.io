// Variant 4 — Typographic statement.
// IIFE-wrapped to avoid babel scope collisions.
(function () {
function VariantStatement() {
  const { PROFILE, ARTICLES } = window;

  // Show first 5 in the compact list, then "all writing →" link.
  const recent = ARTICLES.slice(0, 5);
  const remaining = ARTICLES.length - recent.length;

  return (
    <div style={vsStyles.page}>
      <div style={vsStyles.col}>

        {/* Slim top bar */}
        <nav style={vsStyles.nav}>
          <span style={vsStyles.navName}>{PROFILE.name}</span>
          <div style={vsStyles.navLinks}>
            <a href="#writing" style={vsStyles.navLink}>writing</a>
            <a href="#about" style={vsStyles.navLink}>about</a>
            <a href={PROFILE.links[0].href} style={vsStyles.navLink}>github</a>
          </div>
        </nav>

        {/* Statement */}
        <section style={vsStyles.statementSec}>
          <p style={vsStyles.preLabel}>—  a working notebook</p>
          <h1 style={vsStyles.statement}>
            I write software for a living and{' '}
            <em style={vsStyles.statementEm}>about</em> software
            for everything else. This is where the second part lives —
            field notes from{' '}
            <em style={vsStyles.statementEm}>twelve years</em> of building
            things, mostly in the open, mostly imperfect.
          </h1>
        </section>

        <div style={vsStyles.bigDivider} />

        {/* Writing — compact */}
        <section id="writing" style={vsStyles.writingSec}>
          <div style={vsStyles.writingHead}>
            <h2 style={vsStyles.writingLabel}>Recent writing</h2>
            <a href="#" style={vsStyles.allLink}>
              all {ARTICLES.length} →
            </a>
          </div>

          <ul style={vsStyles.list}>
            {recent.map(a => (
              <li key={a.title} style={vsStyles.listItem}>
                <a href="#" style={vsStyles.itemLink}>
                  <div style={vsStyles.itemLeft}>
                    <h3 style={vsStyles.itemTitle}>{a.title}</h3>
                    <p style={vsStyles.itemExcerpt}>{a.excerpt}</p>
                  </div>
                  <div style={vsStyles.itemRight}>
                    <span style={vsStyles.itemDate}>
                      {a.dateLong.replace(', 2025', '').replace(', 2026', '')}
                    </span>
                    <span style={vsStyles.itemTag}>{a.tag}</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* About sliver */}
        <section id="about" style={vsStyles.aboutSec}>
          <h2 style={vsStyles.writingLabel}>About</h2>
          <p style={vsStyles.aboutBody}>
            {PROFILE.role} based in {PROFILE.location}. I currently work
            on streaming infrastructure and spend my evenings building a
            toy SQL engine in Rust to keep myself honest.
          </p>
          <p style={vsStyles.aboutBody}>
            If you want to talk about distributed systems, query planners,
            or the economics of open source —{' '}
            <a href="#" style={vsStyles.aboutLink}>
              {PROFILE.links.find(l => l.label === 'email').handle}
            </a>.
          </p>
        </section>

        {/* Footer */}
        <footer style={vsStyles.footer}>
          <span style={vsStyles.footerMeta}>© {PROFILE.name}, 2026</span>
          <div style={vsStyles.footerLinks}>
            {PROFILE.links.map(l => (
              <a key={l.label} href={l.href} style={vsStyles.footerLink}>
                {l.label}
              </a>
            ))}
          </div>
        </footer>

      </div>
    </div>
  );
}

const vsStyles = {
  page: {
    fontFamily: '"Fraunces", Georgia, serif',
    background: '#ffffff',
    color: '#111',
    minHeight: '100%',
    padding: '32px 40px 64px',
    fontVariationSettings: '"opsz" 14',
  },
  col: {
    maxWidth: 760,
    margin: '0 auto',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 96,
    paddingBottom: 0,
  },
  navName: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: '-0.005em',
  },
  navLinks: {
    display: 'flex',
    gap: 22,
  },
  navLink: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    color: '#666',
    textDecoration: 'none',
    letterSpacing: '0.02em',
  },
  statementSec: {
    marginBottom: 96,
  },
  preLabel: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    color: '#999',
    margin: 0,
    marginBottom: 24,
    letterSpacing: '0.04em',
  },
  statement: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontWeight: 350,
    fontSize: 44,
    lineHeight: 1.18,
    margin: 0,
    letterSpacing: '-0.025em',
    color: '#0a0a0a',
    fontVariationSettings: '"opsz" 72',
    textWrap: 'pretty',
  },
  statementEm: {
    fontStyle: 'italic',
    fontWeight: 350,
    fontVariationSettings: '"opsz" 72',
  },
  bigDivider: {
    height: 1,
    background: '#111',
    width: 64,
    marginBottom: 56,
  },
  writingSec: {
    marginBottom: 88,
  },
  writingHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 28,
  },
  writingLabel: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#666',
    margin: 0,
  },
  allLink: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    color: '#999',
    textDecoration: 'none',
    letterSpacing: '0.04em',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  listItem: {
    borderBottom: '1px solid #ececec',
  },
  itemLink: {
    display: 'flex',
    gap: 32,
    padding: '22px 0',
    color: '#111',
    textDecoration: 'none',
    alignItems: 'baseline',
  },
  itemLeft: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontSize: 20,
    fontWeight: 450,
    margin: 0,
    marginBottom: 6,
    letterSpacing: '-0.015em',
    lineHeight: 1.25,
    fontVariationSettings: '"opsz" 24',
  },
  itemExcerpt: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontSize: 14.5,
    color: '#666',
    margin: 0,
    lineHeight: 1.5,
    fontVariationSettings: '"opsz" 14',
    textWrap: 'pretty',
  },
  itemRight: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    alignItems: 'flex-end',
    flexShrink: 0,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10.5,
  },
  itemDate: {
    color: '#999',
    letterSpacing: '0.02em',
  },
  itemTag: {
    color: '#bbb',
    letterSpacing: '0.02em',
  },
  aboutSec: {
    marginBottom: 88,
    maxWidth: 600,
  },
  aboutBody: {
    fontSize: 17,
    lineHeight: 1.6,
    color: '#333',
    margin: 0,
    marginTop: 24,
    fontVariationSettings: '"opsz" 14',
    textWrap: 'pretty',
  },
  aboutLink: {
    color: '#111',
    textDecoration: 'none',
    fontStyle: 'italic',
    borderBottom: '1px solid #ccc',
  },
  footer: {
    paddingTop: 28,
    borderTop: '1px solid #ececec',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerMeta: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    color: '#999',
    letterSpacing: '0.02em',
  },
  footerLinks: {
    display: 'flex',
    gap: 18,
  },
  footerLink: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    color: '#666',
    textDecoration: 'none',
    letterSpacing: '0.02em',
  },
};

window.VariantStatement = VariantStatement;
})();
