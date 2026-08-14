function LiquidGlassFilter({ id, scale = 30 }) {
  return (
    <svg
      aria-hidden="true"
      className="liquid-glass-card-v2__filter"
      focusable="false"
      height="0"
      width="0"
    >
      <defs>
        <filter
          colorInterpolationFilters="sRGB"
          height="200%"
          id={id}
          width="200%"
          x="-50%"
          y="-50%"
        >
          <feTurbulence
            baseFrequency="0.05 0.05"
            numOctaves="1"
            result="turbulence"
            seed="1"
            type="fractalNoise"
          />
          <feGaussianBlur
            in="turbulence"
            result="blurredNoise"
            stdDeviation="2"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            result="displaced"
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="B"
          />
          <feGaussianBlur in="displaced" result="finalBlur" stdDeviation="4" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

function LiquidGlassCard({
  as: Component = "section",
  children,
  className = "",
  style,
  ...props
}) {
  return (
    <Component
      className={`liquid-glass-card-v2 ${className}`.trim()}
      style={{
        "--liquid-glass-filter": "blur(2px) saturate(1.08)",
        ...style,
      }}
      {...props}
    >
      <span aria-hidden="true" className="liquid-glass-card-v2__shadow" />
      <span aria-hidden="true" className="liquid-glass-card-v2__optics" />
      {children}
      <span aria-hidden="true" className="liquid-glass-card-v2__sheen" />
    </Component>
  );
}

export default LiquidGlassCard;
export { LiquidGlassFilter };
