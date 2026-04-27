// Variant 3 — Index card / archive.
// IIFE-wrapped to avoid babel scope collisions.
(function () {
function VariantIndex() {
  const { PROFILE, ARTICLES } = window;

  return (
    <div style={viStyles.page}>
      <div style={viStyles.col}>

        {/* Compact masthead */}
        <header style={viStyles.head}>
          <div style={viStyles.headLeft}>
            <h1 style={viStyles.title}>{PROFILE.name}</h1>
            <p style={viStyles.subtitle}>{PROFILE.shortBlurb}</p>
          </div>
          <div style={viStyles.headRight}>
            <span style={viStyles.headMeta}>vol. III</span>
            <span style={viStyles.headMeta}>est. 2019</span>
            <span style={viStyles.headMeta}>{PROFILE.location.split(' ·')[0]}</span>
          </div>
        </header>

        <div style={viStyles.divider} />

        {/* Index table */}
        <section style={viStyles.indexSec}>
          <div style={viStyles.indexHead}>
            <span style={{ ...viStyles.col1, color: '#bbb' }}>№</span>
            <span style={{ ...viStyles.col2, color: '#bbb' }}>date</span>
            <span style={{ ...viStyles.col3, color: '#bbb' }}>title</span>
            <span style={{ ...viStyles.col4, color: '#bbb' }}>section</span>
            <span style={{ ...viStyles.col5, color: '#bbb' }}>length</span>
          </div>

          <ul style={viStyles.rows}>
            {ARTICLES.map((a, i) => {
              const num = String(ARTICLES.length - i).padStart(3, '0');
              const dateShort = a.date.slice(2); // "26-04-12"
              return (
                <li key={a.title}>
                  <a href="#" style={viStyles.row}>
                    <span style={{ ...viStyles.col1, color: '#bbb' }}>{num}</span>
                    <span style={viStyles.col2}>{dateShort}</span>
                    <span style={viStyles.col3}>
                      <span style={viStyles.rowTitle}>{a.title}</span>
                      <span style={viStyles.rowExcerpt}>{a.excerpt}</span>
                    </span>
                    <span style={{ ...viStyles.col4, color: '#666' }}>{a.tag}</span>
                    <span style={{ ...viStyles.col5, color: '#999' }}>{a.readTime}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <div style={viStyles.divider} />

        {/* About + links — the "back of the card" */}
        <section style={viStyles.backside}>
          <div style={viStyles.backCol}>
            <h3 style={viStyles.backLabel}>About</h3>
            <p style={viStyles.backBody}>
              {PROFILE.blurb} I'm based in {PROFILE.location}. Open
              to interesting conversations, especially about query engines,
              consensus protocols, and the design of CLI tools.
            </p>
          </div>
          <div style={viStyles.backCol}>
            <h3 style={viStyles.backLabel}>Elsewhere</h3>
            <ul style={viStyles.backLinks}>
              {PROFILE.links.map(l => (
                <li key={l.label} style={viStyles.backLinkItem}>
                  <span style={viStyles.backLinkLabel}>{l.label}</span>
                  <a href={l.href} style={viStyles.backLinkHref}>{l.handle}</a>
                </li>
              ))}
            </ul>
          </div>
        </section>

      </div>
    </div>
  );
}

const viStyles = {
  page: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    background: '#ffffff',
    color: '#111',
    minHeight: '100%',
    padding: '56px 40px 80px',
  },
  col: {
    maxWidth: 920,
    margin: '0 auto',
  },
  head: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 32,
    marginBottom: 24,
  },
  headLeft: {
    flex: 1,
  },
  title: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontWeight: 400,
    fontSize: 44,
    lineHeight: 1,
    margin: 0,
    marginBottom: 12,
    letterSpacing: '-0.025em',
    fontVariationSettings: '"opsz" 144',
  },
  subtitle: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontSize: 16,
    lineHeight: 1.5,
    color: '#444',
    margin: 0,
    fontStyle: 'italic',
    fontWeight: 300,
    maxWidth: 520,
    fontVariationSettings: '"opsz" 14',
  },
  headRight: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  headMeta: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10.5,
    color: '#999',
    letterSpacing: '0.06em',
    textTransform: 'lowercase',
  },
  divider: {
    height: 1,
    background: '#111',
    margin: '20px 0 0',
  },
  indexSec: {
    marginTop: 0,
    marginBottom: 56,
  },
  indexHead: {
    display: 'grid',
    gridTemplateColumns: '40px 80px 1fr 140px 70px',
    gap: 20,
    padding: '12px 0',
    borderBottom: '1px solid #e8e8e8',
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  rows: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '40px 80px 1fr 140px 70px',
    gap: 20,
    alignItems: 'baseline',
    padding: '18px 0',
    borderBottom: '1px solid #f0f0f0',
    color: '#111',
    textDecoration: 'none',
    fontSize: 12,
  },
  col1: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11 },
  col2: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, color: '#666' },
  col3: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  col4: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11 },
  col5: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, textAlign: 'right' },
  rowTitle: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontSize: 18,
    fontWeight: 500,
    color: '#111',
    letterSpacing: '-0.012em',
    lineHeight: 1.25,
    fontVariationSettings: '"opsz" 24',
  },
  rowExcerpt: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontSize: 14,
    color: '#666',
    lineHeight: 1.5,
    fontVariationSettings: '"opsz" 14',
    textWrap: 'pretty',
  },
  backside: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr',
    gap: 48,
    paddingTop: 28,
  },
  backCol: {},
  backLabel: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#999',
    margin: 0,
    marginBottom: 16,
  },
  backBody: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontSize: 16,
    lineHeight: 1.6,
    color: '#333',
    margin: 0,
    fontVariationSettings: '"opsz" 14',
    textWrap: 'pretty',
  },
  backLinks: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  backLinkItem: {
    display: 'grid',
    gridTemplateColumns: '70px 1fr',
    gap: 12,
    alignItems: 'baseline',
    fontSize: 12,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  },
  backLinkLabel: {
    color: '#999',
  },
  backLinkHref: {
    color: '#111',
    textDecoration: 'none',
    borderBottom: '1px solid #e0e0e0',
  },
};

window.VariantIndex = VariantIndex;
})();
