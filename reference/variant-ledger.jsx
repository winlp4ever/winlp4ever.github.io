// Variant 2 — Asymmetric ledger / dev journal.
// IIFE-wrapped to avoid babel scope collisions.
(function () {
function VariantLedger() {
  const { PROFILE, ARTICLES, NOW_LIST } = window;

  return (
    <div style={vlStyles.page}>
      <div style={vlStyles.frame}>

        {/* Hero */}
        <section style={vlStyles.hero}>
          <div style={vlStyles.gutter}>
            <span style={vlStyles.gutterMeta}>001 ·  index</span>
          </div>
          <div style={vlStyles.body}>
            <h1 style={vlStyles.heroH1}>
              {PROFILE.name}.
            </h1>
            <p style={vlStyles.heroLede}>
              {PROFILE.role.toLowerCase()}. {PROFILE.blurb.toLowerCase()}
            </p>
          </div>
        </section>

        {/* Now */}
        <section style={vlStyles.row}>
          <div style={vlStyles.gutter}>
            <span style={vlStyles.gutterMeta}>now</span>
            <span style={vlStyles.gutterSub}>updated apr&nbsp;26</span>
          </div>
          <div style={vlStyles.body}>
            <ul style={vlStyles.nowList}>
              {NOW_LIST.map((item, i) => (
                <li key={i} style={vlStyles.nowItem}>
                  <span style={vlStyles.nowDash}>—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Articles ledger */}
        <section style={vlStyles.row}>
          <div style={vlStyles.gutter}>
            <span style={vlStyles.gutterMeta}>writing</span>
            <span style={vlStyles.gutterSub}>{ARTICLES.length} entries</span>
          </div>
          <div style={vlStyles.body}>
            <ol style={vlStyles.entries}>
              {ARTICLES.map((a, i) => (
                <li key={a.title} style={vlStyles.entry}>
                  <div style={vlStyles.entryHead}>
                    <span style={vlStyles.entryNum}>
                      {String(ARTICLES.length - i).padStart(2, '0')}
                    </span>
                    <a href="#" style={vlStyles.entryTitle}>
                      {a.title}
                    </a>
                  </div>
                  <p style={vlStyles.entryExcerpt}>{a.excerpt}</p>
                  <div style={vlStyles.entryMeta}>
                    <span>{a.dateLong}</span>
                    <span style={vlStyles.metaDot}>·</span>
                    <span>{a.tag}</span>
                    <span style={vlStyles.metaDot}>·</span>
                    <span>{a.readTime}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Footer */}
        <section style={vlStyles.row}>
          <div style={vlStyles.gutter}>
            <span style={vlStyles.gutterMeta}>elsewhere</span>
          </div>
          <div style={vlStyles.body}>
            <ul style={vlStyles.linkList}>
              {PROFILE.links.map(l => (
                <li key={l.label} style={vlStyles.linkItem}>
                  <span style={vlStyles.linkLabel}>{l.label.padEnd(8, ' ')}</span>
                  <a href={l.href} style={vlStyles.linkHref}>{l.handle}</a>
                </li>
              ))}
            </ul>
          </div>
        </section>

      </div>
    </div>
  );
}

const vlStyles = {
  page: {
    fontFamily: '"Fraunces", Georgia, serif',
    background: '#fdfdfc',
    color: '#0c0c0c',
    minHeight: '100%',
    padding: '72px 48px 96px',
    fontVariationSettings: '"opsz" 14',
  },
  frame: {
    maxWidth: 880,
    margin: '0 auto',
  },
  hero: {
    display: 'grid',
    gridTemplateColumns: '160px 1fr',
    gap: 32,
    paddingBottom: 56,
    marginBottom: 56,
    borderBottom: '1px solid #e6e3dd',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '160px 1fr',
    gap: 32,
    paddingBottom: 48,
    marginBottom: 48,
    borderBottom: '1px solid #e6e3dd',
  },
  gutter: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingTop: 4,
  },
  gutterMeta: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    color: '#999',
    textTransform: 'lowercase',
    letterSpacing: '0.04em',
  },
  gutterSub: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    color: '#bbb',
    letterSpacing: '0.04em',
  },
  body: {
    minWidth: 0,
  },
  heroH1: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontWeight: 400,
    fontSize: 64,
    lineHeight: 0.95,
    margin: 0,
    marginBottom: 24,
    letterSpacing: '-0.03em',
    fontVariationSettings: '"opsz" 144',
  },
  heroLede: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontSize: 19,
    lineHeight: 1.5,
    margin: 0,
    color: '#3a3a3a',
    fontStyle: 'italic',
    fontWeight: 300,
    maxWidth: 560,
    textWrap: 'pretty',
  },
  nowList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  nowItem: {
    display: 'flex',
    gap: 12,
    fontSize: 16,
    color: '#222',
    lineHeight: 1.5,
  },
  nowDash: {
    color: '#bbb',
    flexShrink: 0,
  },
  entries: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    counterReset: 'entry',
  },
  entry: {
    paddingBottom: 28,
    marginBottom: 28,
    borderBottom: '1px dashed #ebe7df',
  },
  entryHead: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 16,
    marginBottom: 8,
  },
  entryNum: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    color: '#bbb',
    flexShrink: 0,
  },
  entryTitle: {
    fontFamily: '"Fraunces", Georgia, serif',
    fontSize: 22,
    fontWeight: 500,
    color: '#0c0c0c',
    textDecoration: 'none',
    lineHeight: 1.25,
    letterSpacing: '-0.015em',
    fontVariationSettings: '"opsz" 24',
  },
  entryExcerpt: {
    fontSize: 15,
    lineHeight: 1.55,
    color: '#555',
    margin: 0,
    marginBottom: 10,
    marginLeft: 31,
    textWrap: 'pretty',
  },
  entryMeta: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginLeft: 31,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    color: '#999',
    letterSpacing: '0.02em',
  },
  metaDot: {
    color: '#ddd',
  },
  linkList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  linkItem: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 13,
  },
  linkLabel: {
    color: '#999',
    whiteSpace: 'pre',
  },
  linkHref: {
    color: '#0c0c0c',
    textDecoration: 'none',
    borderBottom: '1px solid #ddd',
  },
};

window.VariantLedger = VariantLedger;
})();
