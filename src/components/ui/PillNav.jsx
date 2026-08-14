import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

function PillNav({
  activeId,
  ariaLabel = "Section views",
  className = "",
  ease = "power3.out",
  initialLoadAnimation = true,
  items,
  onChange,
}) {
  const rootRef = useRef(null);
  const itemRefs = useRef([]);
  const circleRefs = useRef([]);
  const timelineRefs = useRef([]);
  const activeTweenRefs = useRef([]);

  useLayoutEffect(() => {
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const activeTweens = activeTweenRefs.current;
    const timelines = timelineRefs.current;
    let disposed = false;

    const layout = () => {
      if (disposed) return;

      circleRefs.current.forEach((circle, index) => {
        const pill = circle?.parentElement;
        if (!pill) return;

        const { width, height } = pill.getBoundingClientRect();
        const radius =
          height > 0
            ? ((width * width) / 4 + height * height) / (2 * height)
            : 0;
        const diameter = Math.ceil(2 * radius) + 2;
        const delta =
          Math.ceil(
            radius -
              Math.sqrt(
                Math.max(0, radius * radius - (width * width) / 4),
              ),
          ) + 1;
        const originY = diameter - delta;
        const label = pill.querySelector(".center-pill-nav__label");
        const hoverLabel = pill.querySelector(
          ".center-pill-nav__label--hover",
        );

        circle.style.width = `${diameter}px`;
        circle.style.height = `${diameter}px`;
        circle.style.bottom = `-${delta}px`;

        timelineRefs.current[index]?.kill();
        gsap.set(circle, {
          scale: 0,
          transformOrigin: `50% ${originY}px`,
          xPercent: -50,
        });
        gsap.set(label, { y: 0 });
        gsap.set(hoverLabel, { opacity: 0, y: height + 12 });

        if (reduceMotion) return;

        const timeline = gsap.timeline({ paused: true });
        timeline.to(
          circle,
          {
            duration: 2,
            ease,
            overwrite: "auto",
            scale: 1.2,
            xPercent: -50,
          },
          0,
        );
        timeline.to(
          label,
          {
            duration: 2,
            ease,
            overwrite: "auto",
            y: -(height + 8),
          },
          0,
        );
        timeline.to(
          hoverLabel,
          {
            duration: 2,
            ease,
            opacity: 1,
            overwrite: "auto",
            y: 0,
          },
          0,
        );
        timelineRefs.current[index] = timeline;
      });
    };

    layout();
    window.addEventListener("resize", layout);
    document.fonts?.ready.then(layout).catch(() => {});

    if (initialLoadAnimation && !reduceMotion) {
      gsap.fromTo(
        itemRefs.current,
        { opacity: 0, y: -5 },
        {
          delay: 0.04,
          duration: 0.36,
          ease,
          opacity: 1,
          stagger: 0.035,
          y: 0,
        },
      );
    }

    return () => {
      disposed = true;
      window.removeEventListener("resize", layout);
      activeTweens.forEach((tween) => tween?.kill());
      timelines.forEach((timeline) => timeline?.kill());
    };
  }, [ease, initialLoadAnimation, items]);

  const animateTo = (index, isEntering) => {
    const timeline = timelineRefs.current[index];
    if (!timeline) return;

    activeTweenRefs.current[index]?.kill();
    activeTweenRefs.current[index] = timeline.tweenTo(
      isEntering ? timeline.duration() : 0,
      {
        duration: isEntering ? 0.3 : 0.2,
        ease,
        overwrite: "auto",
      },
    );
  };

  return (
    <nav
      aria-label={ariaLabel}
      className={`center-pill-nav ${className}`.trim()}
      ref={rootRef}
    >
      <ul className="center-pill-nav__list">
        {items.map((item, index) => {
          const isActive = item.id === activeId;

          return (
            <li key={item.id}>
              <button
                aria-current={isActive ? "page" : undefined}
                className={`center-pill-nav__item${isActive ? " is-active" : ""}`}
                onBlur={() => animateTo(index, false)}
                onClick={() => onChange?.(item.id)}
                onFocus={() => animateTo(index, true)}
                onMouseEnter={() => animateTo(index, true)}
                onMouseLeave={() => animateTo(index, false)}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="center-pill-nav__hover-circle"
                  ref={(element) => {
                    circleRefs.current[index] = element;
                  }}
                />
                {item.icon}
                <span className="center-pill-nav__label-stack">
                  <span className="center-pill-nav__label">{item.label}</span>
                  <span
                    aria-hidden="true"
                    className="center-pill-nav__label center-pill-nav__label--hover"
                  >
                    {item.label}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default PillNav;
