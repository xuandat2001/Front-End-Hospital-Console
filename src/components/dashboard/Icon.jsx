const paths = {
  overview: (
    <>
      <path d="M3.5 10.5 12 3l8.5 7.5" />
      <path d="M5.5 9.5V21h13V9.5M9.5 21v-6h5v6" />
    </>
  ),
  modules: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.7 8.8c-.6-.7-1.5-1.1-2.7-1.1-1.7 0-3 .9-3 2.2 0 3.4 6 1.1 6 4.4 0 1.3-1.3 2.2-3 2.2-1.3 0-2.4-.5-3.1-1.3M12 5.7v12.6" />
    </>
  ),
  operations: (
    <>
      <path d="M4 19v-5.5A2.5 2.5 0 0 1 6.5 11H11v8H4ZM13 19v-9h4.5A2.5 2.5 0 0 1 20 12.5V19h-7Z" />
      <circle cx="8" cy="6.5" r="2.5" />
      <circle cx="16" cy="5.5" r="2.5" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      <path d="m3 15 6-6 5 3 7-7" />
    </>
  ),
  insight: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M8 5V3M16 5V3M8 10h8M8 14h5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m7 10 5 5 5-5" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20.5 15.4A8.5 8.5 0 0 1 8.6 3.5 8.6 8.6 0 1 0 20.5 15.4Z" />,
  sparkle: (
    <>
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
      <path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 21 20H3L12 3.5Z" />
      <path d="M12 9v5M12 17.2v.1" />
    </>
  ),
  message: (
    <>
      <path d="M4 5.5h16v11H9l-5 4v-15Z" />
      <path d="M8 10h8M8 13h5" />
    </>
  ),
  volume: (
    <>
      <path d="M4 10v4h3l5 4V6l-5 4H4Z" />
      <path d="M16 9.5a4 4 0 0 1 0 5" />
      <path d="M18.8 7a7.5 7.5 0 0 1 0 10" />
    </>
  ),
  volumeLow: <path d="M4 10v4h3l5 4V6l-5 4H4Z" />,
  upload: (
    <>
      <path d="M12 16V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4 14v6h16v-6" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9M4 12h3M11 12h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  hospital: (
    <>
      <path d="M5 21V4h14v17M2 21h20" />
      <path d="M9 8h6M12 5v6M8 15h2M14 15h2M8 18h2M14 18h2" />
    </>
  ),
  arrowUp: <path d="m6 15 6-6 6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  records: (
    <>
      <path d="M7 4h7l4 4v12H7Z" />
      <path d="M13 4v5h5M9.5 13h6M9.5 16h4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  file: (
    <>
      <path d="M7 3h6l5 5v13H7Z" />
      <path d="M13 3v5h5" />
    </>
  ),
};

function Icon({ name, size = 20, strokeWidth = 1.8, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    >
      {paths[name] || paths.sparkle}
    </svg>
  );
}

export default Icon;
