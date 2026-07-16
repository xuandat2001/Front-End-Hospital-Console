import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ImageViewer({ src, alt, onClose, onDelete }) {
  const [pos, setPos] = useState(() => ({
    x: Math.max(0, (window.innerWidth - 560) / 2),
    y: Math.max(36, window.innerHeight * 0.06),
  }));
  const [size, setSize] = useState({ w: 560, h: 480 });

  useEffect(() => {
    setSize({
      w: Math.min(560, window.innerWidth - 80),
      h: Math.min(480, window.innerHeight - 80),
    });
  }, []);

  function onHeaderMouseDown(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const offsetX = pos.x;
    const offsetY = pos.y;

    function onMove(ev) {
      setPos({
        x: Math.max(0, offsetX + ev.clientX - startX),
        y: Math.max(0, offsetY + ev.clientY - startY),
      });
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function onResizeMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = size.w;
    const startH = size.h;

    function onMove(ev) {
      setSize({
        w: Math.max(240, startW + ev.clientX - startX),
        h: Math.max(200, startH + ev.clientY - startY),
      });
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return createPortal(
    <div
      className="liquid-media-viewer liquid-media-viewer--image"
      style={{
        position: 'fixed',
        zIndex: 13600,
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* title bar */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px 6px 14px',
          cursor: 'grab',
          flexShrink: 0,
          userSelect: 'none',
          background: 'rgba(255,255,255,0.06)',
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginRight: 8,
          }}
        >
          {alt}
        </span>
        {onDelete && (
          <button
            onClick={onDelete}
            style={{
              width: 26,
              height: 26,
              display: 'grid',
              placeItems: 'center',
              border: 'none',
              borderRadius: 5,
              background: 'rgba(239,68,68,0.2)',
              color: 'rgba(239,68,68,0.8)',
              cursor: 'pointer',
              flexShrink: 0,
              marginRight: 4,
            }}
            aria-label="Delete image"
            title="Delete"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
        <button
          onClick={onClose}
          style={{
            width: 26,
            height: 26,
            display: 'grid',
            placeItems: 'center',
            border: 'none',
            borderRadius: 5,
            background: 'transparent',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            flexShrink: 0,
            fontSize: 16,
            lineHeight: 1,
          }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* image area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: 4,
        }}
      >
        <img
          src={src}
          alt={alt}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
          draggable={false}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.textContent = 'Failed to load image';
          }}
        />
      </div>

      {/* resize handle */}
      <div
        onMouseDown={onResizeMouseDown}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 16,
          height: 16,
          cursor: 'nwse-resize',
          background: 'rgba(255,255,255,0.15)',
          borderBottomRightRadius: 10,
        }}
      />
    </div>,
    document.body,
  );
}
