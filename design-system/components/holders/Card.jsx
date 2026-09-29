export function Card({ children, style }) {
  return React.createElement('div', {
    style: { background: 'var(--surface-card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)', padding: 'var(--space-6)', ...style },
  }, children);
}
