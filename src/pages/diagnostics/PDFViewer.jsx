import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function PDFViewer({ src, name, onClose, onDelete }) {
  const [pos, setPos] = useState(() => ({
    x: Math.max(0, (window.innerWidth - 640) / 2),
    y: Math.max(36, window.innerHeight * 0.06),
  }));
  const [size, setSize] = useState({ w: 640, h: 560 });

  useEffect(() => {
    setSize({
      w: Math.min(640, window.innerWidth - 80),
      h: Math.min(560, window.innerHeight - 80),
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
        w: Math.max(320, startW + ev.clientX - startX),
        h: Math.max(240, startH + ev.clientY - startY),
      });
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function openPdf() {
    window.open(src, '_blank', 'noopener,noreferrer');
  }

  const downloadName = name?.toLowerCase().endsWith('.pdf') ? name : `${name || 'diagnostic-result'}.pdf`;

  return createPortal(
    <div
      className="liquid-media-viewer liquid-media-viewer--pdf"
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
          {name || 'PDF'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <a
            href={src}
            download={downloadName}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: 26,
              height: 26,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 5,
              background: 'transparent',
              color: 'rgba(255,255,255,0.55)',
              textDecoration: 'none',
            }}
            aria-label="Download PDF"
            title="Download"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </a>
          <button
            onClick={openPdf}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: 26,
              height: 26,
              display: 'grid',
              placeItems: 'center',
              border: 'none',
              borderRadius: 5,
              background: 'transparent',
              color: 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
            }}
            aria-label="Open PDF in new tab"
            title="Open"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              onMouseDown={(e) => e.stopPropagation()}
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
              }}
              aria-label="Delete PDF"
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
            onMouseDown={(e) => e.stopPropagation()}
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
              fontSize: 16,
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: '#525252',
        }}
      >
        <object
          data={`${src}#view=FitH`}
          type="application/pdf"
          aria-label={name || 'PDF'}
          style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
        >
          <iframe
            src={`${src}#view=FitH`}
            title={name || 'PDF'}
            style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
          />
        </object>
      </div>

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
