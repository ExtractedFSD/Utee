export function QuoteCard({ quote, name, role, style }) {
  return React.createElement('div', { style: { position: 'relative', display: 'inline-block', maxWidth: 320, ...style } },
    React.createElement('div', { style: { fontFamily: 'var(--font-display)', color: '#fff', fontSize: 64, lineHeight: 0.5, position: 'absolute', top: 2, left: 18 } }, '\u201C'),
    React.createElement('div', { style: { background: 'var(--pink)', borderRadius: 20, padding: '30px 24px 20px', marginTop: 18, boxShadow: 'var(--shadow-card)' } },
      React.createElement('div', { style: { fontFamily: 'var(--font-body)', fontWeight: 600, color: 'var(--maroon)', fontSize: 15, lineHeight: 1.45 } }, quote),
      name && React.createElement('div', { style: { marginTop: 14, fontFamily: 'var(--font-body)', color: 'var(--maroon)' } },
        React.createElement('div', { style: { fontWeight: 700, fontSize: 12 } }, name),
        role && React.createElement('div', { style: { fontSize: 11, opacity: 0.85 } }, role))));
}
