/* @ds-bundle: {"format":4,"namespace":"UteeDesignSystem_35b79c","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"EyebrowTab","sourcePath":"components/core/EyebrowTab.jsx"},{"name":"RangeTag","sourcePath":"components/core/RangeTag.jsx"},{"name":"Sticker","sourcePath":"components/core/Sticker.jsx"},{"name":"Card","sourcePath":"components/holders/Card.jsx"},{"name":"CircleImageHolder","sourcePath":"components/holders/CircleImageHolder.jsx"},{"name":"CurveImageHolder","sourcePath":"components/holders/CurveImageHolder.jsx"},{"name":"QuoteCard","sourcePath":"components/holders/QuoteCard.jsx"},{"name":"RoundHoldingDevice","sourcePath":"components/holders/RoundHoldingDevice.jsx"}],"sourceHashes":{"components/core/Button.jsx":"9b67c4afe5e2","components/core/EyebrowTab.jsx":"9139665666a4","components/core/RangeTag.jsx":"b20a9e7978bf","components/core/Sticker.jsx":"afd9406b3265","components/holders/Card.jsx":"a21f5e4e7eb4","components/holders/CircleImageHolder.jsx":"26ac1e2d83a1","components/holders/CurveImageHolder.jsx":"f54c0920a3fc","components/holders/QuoteCard.jsx":"0b1cbd3d4239","components/holders/RoundHoldingDevice.jsx":"25e6b881065b"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.UteeDesignSystem_35b79c = window.UteeDesignSystem_35b79c || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Button.jsx
try { (() => {
function Button({
  children,
  onClick,
  href,
  style
}) {
  const Tag = href ? 'a' : 'button';
  return React.createElement(Tag, {
    href,
    onClick,
    style: {
      display: 'inline-block',
      background: 'var(--cta-bg)',
      color: 'var(--cta-text)',
      border: 'none',
      borderRadius: 'var(--radius-pill)',
      padding: '14px 32px',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      textDecoration: 'none',
      cursor: 'pointer',
      boxShadow: 'var(--shadow-card)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/EyebrowTab.jsx
try { (() => {
function EyebrowTab({
  children,
  pill = true,
  onDark = true,
  style
}) {
  return React.createElement('span', {
    style: pill ? {
      display: 'inline-block',
      background: '#fff',
      color: 'var(--midnight)',
      borderRadius: 'var(--radius-pill)',
      padding: '12px 26px',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      ...style
    } : {
      display: 'inline-block',
      color: onDark ? '#fff' : 'var(--midnight)',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { EyebrowTab });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/EyebrowTab.jsx", error: String((e && e.message) || e) }); }

// components/core/RangeTag.jsx
try { (() => {
const RANGE_COLORS = {
  mint: 'var(--mint)',
  peach: 'var(--peach)',
  sky: 'var(--sky)',
  sun: 'var(--sun)',
  lavender: 'var(--lavender)'
};
function RangeTag({
  range = 'mint',
  children,
  style
}) {
  return React.createElement('span', {
    style: {
      display: 'inline-block',
      background: RANGE_COLORS[range] || RANGE_COLORS.mint,
      color: 'var(--midnight)',
      borderRadius: 'var(--radius-pill)',
      padding: '6px 16px',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { RangeTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/RangeTag.jsx", error: String((e && e.message) || e) }); }

// components/core/Sticker.jsx
try { (() => {
function Sticker({
  children,
  style
}) {
  return React.createElement('div', {
    style: {
      background: 'var(--gradient-brand-soft)',
      borderRadius: 28,
      padding: '22px 26px',
      boxShadow: 'var(--shadow-sticker)',
      display: 'inline-block',
      maxWidth: 300,
      ...style
    }
  }, React.createElement('div', {
    style: {
      fontFamily: 'var(--font-cta)',
      fontWeight: 700,
      color: '#fff',
      fontSize: 22,
      lineHeight: 1.25
    }
  }, children));
}
Object.assign(__ds_scope, { Sticker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Sticker.jsx", error: String((e && e.message) || e) }); }

// components/holders/Card.jsx
try { (() => {
function Card({
  children,
  style
}) {
  return React.createElement('div', {
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-card)',
      padding: 'var(--space-6)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/holders/Card.jsx", error: String((e && e.message) || e) }); }

// components/holders/CircleImageHolder.jsx
try { (() => {
function CircleImageHolder({
  src,
  alt = '',
  label,
  size = 220,
  style
}) {
  const r = size / 2;
  const pad = 26;
  return React.createElement('div', {
    style: {
      position: 'relative',
      width: size,
      height: size,
      ...style
    }
  }, React.createElement('img', {
    src,
    alt,
    style: {
      position: 'absolute',
      inset: pad,
      width: size - pad * 2,
      height: size - pad * 2,
      borderRadius: '50%',
      objectFit: 'cover'
    }
  }), label && React.createElement('svg', {
    viewBox: `0 0 ${size} ${size}`,
    style: {
      position: 'absolute',
      inset: 0
    }
  }, React.createElement('defs', null, React.createElement('path', {
    id: 'circ',
    d: `M ${r} ${size - 10} A ${r - 10} ${r - 10} 0 1 1 ${r + 0.01} ${size - 10}`
  })), React.createElement('text', {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: '.22em',
      fill: 'currentColor'
    }
  }, React.createElement('textPath', {
    href: '#circ',
    startOffset: '25%',
    textAnchor: 'middle'
  }, label.toUpperCase()))));
}
Object.assign(__ds_scope, { CircleImageHolder });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/holders/CircleImageHolder.jsx", error: String((e && e.message) || e) }); }

// components/holders/CurveImageHolder.jsx
try { (() => {
function CurveImageHolder({
  src,
  alt = '',
  width = 280,
  height = 220,
  style
}) {
  return React.createElement('img', {
    src,
    alt,
    style: {
      width,
      height,
      objectFit: 'cover',
      borderRadius: `${width / 2}px ${width / 2}px 24px 24px`,
      display: 'block',
      ...style
    }
  });
}
Object.assign(__ds_scope, { CurveImageHolder });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/holders/CurveImageHolder.jsx", error: String((e && e.message) || e) }); }

// components/holders/QuoteCard.jsx
try { (() => {
function QuoteCard({
  quote,
  name,
  role,
  style
}) {
  return React.createElement('div', {
    style: {
      position: 'relative',
      display: 'inline-block',
      maxWidth: 320,
      ...style
    }
  }, React.createElement('div', {
    style: {
      fontFamily: 'var(--font-display)',
      color: '#fff',
      fontSize: 64,
      lineHeight: 0.5,
      position: 'absolute',
      top: 2,
      left: 18
    }
  }, '\u201C'), React.createElement('div', {
    style: {
      background: 'var(--pink)',
      borderRadius: 20,
      padding: '30px 24px 20px',
      marginTop: 18,
      boxShadow: 'var(--shadow-card)'
    }
  }, React.createElement('div', {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      color: 'var(--maroon)',
      fontSize: 15,
      lineHeight: 1.45
    }
  }, quote), name && React.createElement('div', {
    style: {
      marginTop: 14,
      fontFamily: 'var(--font-body)',
      color: 'var(--maroon)'
    }
  }, React.createElement('div', {
    style: {
      fontWeight: 700,
      fontSize: 12
    }
  }, name), role && React.createElement('div', {
    style: {
      fontSize: 11,
      opacity: 0.85
    }
  }, role))));
}
Object.assign(__ds_scope, { QuoteCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/holders/QuoteCard.jsx", error: String((e && e.message) || e) }); }

// components/holders/RoundHoldingDevice.jsx
try { (() => {
function RoundHoldingDevice({
  children,
  label,
  style
}) {
  return React.createElement('div', {
    style: {
      background: 'var(--gradient-brand-soft)',
      borderRadius: 40,
      width: 170,
      height: 170,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      boxShadow: 'var(--shadow-sticker)',
      ...style
    }
  }, children, label && React.createElement('div', {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 300,
      color: '#fff',
      fontSize: 20
    }
  }, label));
}
Object.assign(__ds_scope, { RoundHoldingDevice });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/holders/RoundHoldingDevice.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.EyebrowTab = __ds_scope.EyebrowTab;

__ds_ns.RangeTag = __ds_scope.RangeTag;

__ds_ns.Sticker = __ds_scope.Sticker;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CircleImageHolder = __ds_scope.CircleImageHolder;

__ds_ns.CurveImageHolder = __ds_scope.CurveImageHolder;

__ds_ns.QuoteCard = __ds_scope.QuoteCard;

__ds_ns.RoundHoldingDevice = __ds_scope.RoundHoldingDevice;

})();
