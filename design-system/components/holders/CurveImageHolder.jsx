export function CurveImageHolder({ src, alt = '', width = 280, height = 220, style }) {
  return React.createElement('img', {
    src, alt,
    style: { width, height, objectFit: 'cover', borderRadius: `${width / 2}px ${width / 2}px 24px 24px`, display: 'block', ...style },
  });
}
