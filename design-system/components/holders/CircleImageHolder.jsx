export function CircleImageHolder({ src, alt = '', label, size = 220, style }) {
  const r = size / 2;
  const pad = 26;
  return React.createElement('div', { style: { position: 'relative', width: size, height: size, ...style } },
    React.createElement('img', { src, alt, style: { position: 'absolute', inset: pad, width: size - pad * 2, height: size - pad * 2, borderRadius: '50%', objectFit: 'cover' } }),
    label && React.createElement('svg', { viewBox: `0 0 ${size} ${size}`, style: { position: 'absolute', inset: 0 } },
      React.createElement('defs', null, React.createElement('path', { id: 'circ', d: `M ${r} ${size - 10} A ${r - 10} ${r - 10} 0 1 1 ${r + 0.01} ${size - 10}` })),
      React.createElement('text', { style: { fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, letterSpacing: '.22em', fill: 'currentColor' } },
        React.createElement('textPath', { href: '#circ', startOffset: '25%', textAnchor: 'middle' }, label.toUpperCase()))));
}
