export function Button({ children, onClick, href, style }) {
  const Tag = href ? 'a' : 'button';
  return React.createElement(Tag, {
    href, onClick,
    style: {
      display: 'inline-block', background: 'var(--cta-bg)', color: 'var(--cta-text)',
      border: 'none', borderRadius: 'var(--radius-pill)', padding: '14px 32px',
      fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
      letterSpacing: '.14em', textTransform: 'uppercase', textDecoration: 'none',
      cursor: 'pointer', boxShadow: 'var(--shadow-card)', ...style,
    },
  }, children);
}
