export function EyebrowTab({ children, pill = true, onDark = true, style }) {
  return React.createElement('span', {
    style: pill ? {
      display: 'inline-block', background: '#fff', color: 'var(--midnight)',
      borderRadius: 'var(--radius-pill)', padding: '12px 26px',
      fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
      letterSpacing: '.14em', textTransform: 'uppercase', ...style,
    } : {
      display: 'inline-block', color: onDark ? '#fff' : 'var(--midnight)',
      fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
      letterSpacing: '.14em', textTransform: 'uppercase', ...style,
    },
  }, children);
}
