const RANGE_COLORS = { mint: 'var(--mint)', peach: 'var(--peach)', sky: 'var(--sky)', sun: 'var(--sun)', lavender: 'var(--lavender)' };
export function RangeTag({ range = 'mint', children, style }) {
  return React.createElement('span', {
    style: {
      display: 'inline-block', background: RANGE_COLORS[range] || RANGE_COLORS.mint,
      color: 'var(--midnight)', borderRadius: 'var(--radius-pill)', padding: '6px 16px',
      fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11,
      letterSpacing: '.12em', textTransform: 'uppercase', ...style,
    },
  }, children);
}
