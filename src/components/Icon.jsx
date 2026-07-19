const ICONS = {
  activity: (
    <>
      <path d="M4 12h4l2-6 4 12 2-6h4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 3.5 18a2 2 0 0 0 1.7 3h13.6a2 2 0 0 0 1.7-3L12 3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16V9" />
      <path d="M12 16V6" />
      <path d="M16 16v-4" />
    </>
  ),
  check: (
    <>
      <path d="m5 12 4 4L19 6" />
    </>
  ),
  chevronLeft: (
    <>
      <path d="m15 18-6-6 6-6" />
    </>
  ),
  chevronRight: (
    <>
      <path d="m9 18 6-6-6-6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.5 5.3A10.6 10.6 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.2 3.1" />
      <path d="M6.2 6.7C3.9 8.3 2.5 12 2.5 12s3.5 7 9.5 7a9.6 9.6 0 0 0 4.2-.9" />
    </>
  ),
  dashboard: (
    <>
      <path d="M4 13h6V5H4v8Z" />
      <path d="M14 19h6V5h-6v14Z" />
      <path d="M4 19h6v-3H4v3Z" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </>
  ),
  folder: (
    <>
      <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
    </>
  ),
  headset: (
    <>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M4 13v3a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2Z" />
      <path d="M20 13v3a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2Z" />
      <path d="M16 19c-.9 1.2-2.2 2-4 2" />
    </>
  ),
  home: (
    <>
      <path d="m4 11 8-7 8 7" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8-8" />
      <path d="m15 8 2 2" />
      <path d="m17 6 2 2" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  mail: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  message: (
    <>
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </>
  ),
  logIn: (
    <>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </>
  ),
  logOut: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  play: (
    <>
      <path d="M7 5v14l12-7-12-7Z" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 0 1-14.2 5" />
      <path d="M4 12A8 8 0 0 1 18.2 7" />
      <path d="M18 3v4h-4" />
      <path d="M6 21v-4h4" />
    </>
  ),
  reports: (
    <>
      <path d="M5 19V5" />
      <path d="M5 19h14" />
      <path d="M9 16V9" />
      <path d="M13 16V7" />
      <path d="M17 16v-4" />
    </>
  ),
  save: (
    <>
      <path d="M5 4h12l2 2v14H5V4Z" />
      <path d="M8 4v6h8V4" />
      <path d="M8 20v-6h8v6" />
    </>
  ),
  send: (
    <>
      <path d="m21 3-8 18-4-8-8-4 20-6Z" />
      <path d="m9 13 12-10" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z" />
    </>
  ),
  tag: (
    <>
      <path d="M20 12 12 20 4 12V4h8l8 8Z" />
      <path d="M8 8h.01" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V7Z" />
      <path d="M10 5v14" strokeDasharray="2 3" />
    </>
  ),
  trend: (
    <>
      <path d="m4 16 6-6 4 4 6-8" />
      <path d="M14 6h6v6" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </>
  ),
  user: (
    <>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M19 20a7 7 0 0 0-14 0" />
    </>
  ),
  userPlus: (
    <>
      <path d="M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M3 20a7 7 0 0 1 11-5.7" />
      <path d="M18 14v6" />
      <path d="M15 17h6" />
    </>
  ),
  users: (
    <>
      <path d="M16 11a3 3 0 1 0 0-6" />
      <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M2 20a6 6 0 0 1 12 0" />
      <path d="M17 14a5 5 0 0 1 5 5" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  zoomIn: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
      <path d="M8 11h6" />
    </>
  ),
};

export default function Icon({ name, size = 18, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name] || ICONS.ticket}
    </svg>
  );
}


