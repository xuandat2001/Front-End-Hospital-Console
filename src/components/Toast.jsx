import { useState, useEffect, useCallback } from 'react';

let toastId = 0;
let addToastFn = null;

export function toast(message, type = 'success') {
  if (addToastFn) addToastFn({ id: ++toastId, message, type });
}

export default function ToastContainer() {
  const [items, setItems] = useState([]);

  const add = useCallback((t) => {
    setItems((prev) => [...prev, t]);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== t.id));
    }, 3000);
  }, []);

  useEffect(() => {
    addToastFn = add;
    return () => { addToastFn = null; };
  }, [add]);

  if (items.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
    }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: item.type === 'success' ? '#16a34a' : '#dc2626',
            color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            pointerEvents: 'auto', whiteSpace: 'nowrap',
          }}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
