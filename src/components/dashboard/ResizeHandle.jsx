import { useEffect, useRef } from 'react';

const DEFAULTS = { left: 190, right: 270 };
const MIN = { left: 140, right: 200 };
const MAX = { left: 450, right: 500 };

function getStartWidth(position) {
  const saved = localStorage.getItem(`${position}RailWidth`);
  if (saved) return parseFloat(saved);
  const fromCSS = parseFloat(
    getComputedStyle(document.documentElement)
      .getPropertyValue(`--${position}-rail-width`)
      .replace('px', '')
  );
  return fromCSS || DEFAULTS[position];
}

export default function ResizeHandle({ position }) {
  const barRef = useRef(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let dragging = false;
    let startX = 0;
    let startWidth = 0;

    const onDown = (e) => {
      dragging = true;
      startX = e.clientX;
      startWidth = getStartWidth(position);
      bar.classList.add('resize-handle--active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const onMove = (e) => {
      if (!dragging) return;
      const delta = e.clientX - startX;
      const raw = position === 'left' ? startWidth + delta : startWidth - delta;
      const width = Math.round(Math.max(MIN[position], Math.min(MAX[position], raw)));
      document.documentElement.style.setProperty(`--${position}-rail-width`, `${width}px`);
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      bar.classList.remove('resize-handle--active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const finalWidth = parseFloat(
        getComputedStyle(document.documentElement)
          .getPropertyValue(`--${position}-rail-width`)
          .replace('px', '')
      );
      if (finalWidth) {
        localStorage.setItem(`${position}RailWidth`, Math.round(finalWidth));
      }
    };

    bar.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    return () => {
      bar.removeEventListener('mousedown', onDown);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [position]);

  return (
    <div
      ref={barRef}
      className={`resize-handle resize-handle--${position}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${position === 'left' ? 'left' : 'right'} panel`}
    >
      <div className="resize-handle__line" />
    </div>
  );
}
