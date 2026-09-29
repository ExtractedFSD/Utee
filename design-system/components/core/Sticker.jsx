export function Sticker({ children, style }) {
  return React.createElement('div', {
    style: {
      background: 'var(--gradient-brand-soft)', borderRadius: 28, padding: '22px 26px',
      boxShadow: 'var(--shadow-sticker)', display: 'inline-block', maxWidth: 300, ...style,
    },
  }, React.createElement('div', {
    style: { fontFamily: 'var(--font-cta)', fontWeight: 700, color: '#fff', fontSize: 22, lineHeight: 1.25 },
  }, children));
}
