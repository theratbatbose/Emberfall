// Original hand-drawn SVG icons for Emberfall (24×24 grid). No third-party icon art.
import type { SVGProps } from 'react';

const P: Record<string, React.ReactNode> = {
  flame: <path d="M12 2c1.5 3.5 6 5.5 6 11a6 6 0 0 1-12 0c0-2.8 1.6-4.4 2.6-6 .3 2 1.3 3 2.4 3.3C10 7 11.4 4.5 12 2z" />,
  sword: (
    <>
      <path d="M19 3l2 2-10.5 10.5-2-2z" />
      <path d="M6.5 12.5l5 5M8 17l-3.5 3.5M5 15.5l3.5 3.5" fill="none" />
    </>
  ),
  helm: <path d="M4 14a8 8 0 0 1 16 0v4h-4l-1-3h-6l-1 3H4zM12 6v8" />,
  chest: <path d="M7 3l5 3 5-3 3 4-3 2v12H7V9L4 7zM12 6v15" />,
  gloves: <path d="M8 21v-6L5 11l1.5-1.5L9 12V4.5a1 1 0 0 1 2 0V10V3.5a1 1 0 0 1 2 0V10V4.5a1 1 0 0 1 2 0V11v-4a1 1 0 0 1 2 0v8l-2 6z" />,
  boots: <path d="M7 3h6v9l6 3a2 2 0 0 1 1 1.8V20H5V3zM5 17h15" />,
  amulet: (
    <>
      <path d="M6 3c0 6 3 9 6 9s6-3 6-9" fill="none" />
      <path d="M12 12l4 4-4 6-4-6z" />
    </>
  ),
  ring: (
    <>
      <circle cx="12" cy="14" r="6" fill="none" />
      <path d="M9 6l3-3 3 3-3 3z" />
    </>
  ),
  relic: <path d="M12 2l7 7-7 13L5 9zM5 9h14M9 9l3 13 3-13-3-7z" />,
  drop: <path d="M12 2c3 5 7 9 7 13a7 7 0 0 1-14 0c0-4 4-8 7-13z" />,
  anvil: <path d="M3 7h13c0 2 2 3 5 3v2h-6l-1 3h3v4H7v-4h3l-1-3H6C4 12 3 10 3 7z" />,
  hearth: (
    <>
      <path d="M3 11l9-8 9 8v10H3z" fill="none" />
      <path d="M12 11c1 2 3 3 3 5.5a3 3 0 0 1-6 0c0-1.5 1-2.5 1.5-3.5.2 1 .7 1.6 1.2 1.7-.4-1.4 0-2.7.3-3.7z" />
    </>
  ),
  book: <path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z" />,
  lantern: (
    <>
      <path d="M9 2h6M12 2v2M7 7h10l-1-3H8zM7 7v11h10V7M6 18h12v2H6z" fill="none" />
      <path d="M12 9.5c.8 1.4 2 2.2 2 3.8a2 2 0 0 1-4 0c0-1.2.8-2 1.3-2.6 0 .6.3 1 .6 1.1-.2-.9 0-1.6.1-2.3z" />
    </>
  ),
  scroll: <path d="M6 3h12a2 2 0 0 1 0 4h-1v12a2 2 0 0 1-2 2H5a2 2 0 0 1 0-4h1zM6 17V5M9 9h5M9 12h5" />,
  coin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" fill="none" stroke="#1a0d05" />
    </>
  ),
  treasure: <path d="M3 10a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v10H3zM3 11h18M10 11v3h4v-3" />,
  torch: (
    <>
      <path d="M10 10h4l-1 12h-2z" />
      <path d="M12 1c1 2.4 4 3.6 4 6.8a4 4 0 0 1-8 0c0-1.8 1-3 1.7-4 .2 1.3.9 2 1.6 2.2C11 4.2 11.6 2.6 12 1z" />
    </>
  ),
  map: <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15" />,
  gear: (
    <>
      <path d="M10 2h4l.6 3 2.4 1.4 2.9-1 2 3.4-2.3 2v2.4l2.3 2-2 3.4-2.9-1-2.4 1.4L14 22h-4l-.6-3-2.4-1.4-2.9 1-2-3.4 2.3-2v-2.4l-2.3-2 2-3.4 2.9 1L9.4 5z" />
      <circle cx="12" cy="12" r="3" fill="#0c0908" />
    </>
  ),
  plus: <path d="M12 4v16M4 12h16" fill="none" />,
  check: <path d="M4 12.5l5 5L20 6.5" fill="none" />,
  trash: <path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" fill="none" />,
  play: <path d="M7 4l13 8-13 8z" />,
  pause: <path d="M6 4h4v16H6zM14 4h4v16h-4z" />,
  stop: <path d="M6 6h12v12H6z" />,
  hourglass: <path d="M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10" fill="none" />,
  star: <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z" />,
  tree: (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="12" cy="3.5" r="1.8" />
      <circle cx="20" cy="9" r="1.8" />
      <circle cx="17" cy="20" r="1.8" />
      <circle cx="7" cy="20" r="1.8" />
      <circle cx="4" cy="9" r="1.8" />
      <path d="M12 9.5V5.3M14.3 11l4-1.5M13.5 14l2.6 4.4M10.5 14l-2.6 4.4M9.7 11l-4-1.5" fill="none" />
    </>
  ),
  bag: <path d="M8 7V5a4 4 0 0 1 8 0v2M4 7h16l-1 14H5z" />,
  back: <path d="M15 4l-8 8 8 8" fill="none" />,
  close: <path d="M5 5l14 14M19 5L5 19" fill="none" />,
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0" />,
  shield: <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />,
  flag: <path d="M5 21V3M5 4h12l-2 4 2 4H5" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" fill="none" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  quill: <path d="M20 3C12 4 7 10 6 18l-2 3M20 3c-1 6-5 10-11 12M9 15l-3 3" fill="none" />,
  up: <path d="M5 15l7-7 7 7" fill="none" />,
  down: <path d="M5 9l7 7 7-7" fill="none" />,
  hero: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 22c0-5 3.5-8 8-8s8 3 8 8z" />
    </>
  ),
  chart: <path d="M3 3v18h18M6 16l4-6 4 3 6-8" fill="none" />,
  home: <path d="M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5" fill="none" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1" fill="none" />,
  realm: <path d="M2 20l6-10 4 6 3-4 7 8zM16 5a2 2 0 1 0 0 .01" />,
  download: <path d="M12 3v12M6 10l6 6 6-6M4 21h16" fill="none" />,
  upload: <path d="M12 16V4M6 9l6-6 6 6M4 21h16" fill="none" />,
  skull: (
    <>
      <path d="M12 2a8 8 0 0 0-8 8c0 3 1.5 4.5 3 5.5V20h10v-4.5c1.5-1 3-2.5 3-5.5a8 8 0 0 0-8-8z" />
      <circle cx="9" cy="10.5" r="1.8" fill="#0c0908" />
      <circle cx="15" cy="10.5" r="1.8" fill="#0c0908" />
    </>
  ),
  sparkle: <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
};

const STROKE_ONLY = new Set(['plus', 'check', 'trash', 'back', 'close', 'hourglass', 'quill', 'up', 'down', 'chart', 'home', 'list', 'download', 'upload', 'map']);

export function Icon({ name, size = 22, ...rest }: { name: string; size?: number } & SVGProps<SVGSVGElement>) {
  const strokeOnly = STROKE_ONLY.has(name);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={strokeOnly ? 'none' : 'currentColor'}
      stroke="currentColor"
      strokeWidth={strokeOnly ? 2 : 1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {P[name] ?? P.star}
    </svg>
  );
}
