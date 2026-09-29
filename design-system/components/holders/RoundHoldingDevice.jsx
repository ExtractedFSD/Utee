export function RoundHoldingDevice({ children, label, style }) {
  return React.createElement('div', {
    style: {
      background: 'var(--gradient-brand-soft)', borderRadius: 40, width: 170, height: 170,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 8, boxShadow: 'var(--shadow-sticker)', ...style,
    },
  },
    children,
    label && React.createElement('div', { style: { fontFamily: 'var(--font-display)', fontWeight: 300, color: '#fff', fontSize: 20 } }, label));
}
