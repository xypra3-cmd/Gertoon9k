// Icon geometry shared by web (<svg>) and mobile (react-native-svg) → identical icons on every platform.
// 24×24 viewBox, stroke 2, round caps/joins (lucide style, ISC licensed shapes).

export type IconNode =
  | ['path', { d: string }]
  | ['circle', { cx: number; cy: number; r: number }]
  | ['rect', { x: number; y: number; width: number; height: number; rx?: number }];

const p = (d: string): IconNode => ['path', { d }];
const c = (cx: number, cy: number, r: number): IconNode => ['circle', { cx, cy, r }];
const r = (x: number, y: number, width: number, height: number, rx = 2): IconNode => ['rect', { x, y, width, height, rx }];

export const ICONS = {
  phone: [p('M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z')],
  mail: [r(2, 4, 20, 16), p('m22 6-10 7L2 6')],
  globe: [c(12, 12, 10), p('M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20')],
  map: [p('M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z'), c(12, 10, 3)],
  download: [p('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3')],
  share: [c(18, 5, 3), c(6, 12, 3), c(18, 19, 3), p('m8.6 13.5 6.8 4M15.4 6.5l-6.8 4')],
  userPlus: [p('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'), c(9, 7, 4), p('M19 8v6M22 11h-6')],
  send: [p('m22 2-7 20-4-9-9-4z'), p('M22 2 11 13')],
  link: [p('M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7'), p('M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7')],
  lock: [r(3, 11, 18, 11), p('M7 11V7a5 5 0 0 1 10 0v4')],
  check: [p('M20 6 9 17l-5-5')],
  x: [p('M18 6 6 18M6 6l12 12')],
  menu: [p('M3 12h18M3 6h18M3 18h18')],
  sparkles: [
    p('M9.9 15.5A2 2 0 0 0 8.5 14.1l-6.1-1.6a.5.5 0 0 1 0-1l6.1-1.6a2 2 0 0 0 1.4-1.4l1.6-6.1a.5.5 0 0 1 1 0l1.6 6.1a2 2 0 0 0 1.4 1.4l6.1 1.6a.5.5 0 0 1 0 1l-6.1 1.6a2 2 0 0 0-1.4 1.4l-1.6 6.1a.5.5 0 0 1-1 0z'),
    p('M20 3v4M22 5h-4'),
  ],
  gift: [r(3, 8, 18, 4, 1), p('M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7'), p('M7.5 8a2.5 2.5 0 0 1 0-5C9.4 3 12 8 12 8s2.6-5 4.5-5a2.5 2.5 0 0 1 0 5')],
  camera: [p('M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z'), c(12, 13, 3)],
  calendar: [r(3, 4, 18, 18), p('M16 2v4M8 2v4M3 10h18')],
  copy: [r(8, 8, 14, 14), p('M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2')],
  pen: [p('M12 20h9'), p('M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z')],
  home: [p('m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'), p('M9 22V12h6v10')],
  qr: [r(3, 3, 7, 7, 1), r(14, 3, 7, 7, 1), r(3, 14, 7, 7, 1), p('M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3')],
  users: [p('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'), c(9, 7, 4), p('M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8')],
  chart: [p('M3 3v18h18'), p('M7 16l4-6 4 3 5-7')],
  settings: [c(12, 12, 3), p('M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z')],
  scan: [p('M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10')],
  arrowRight: [p('M5 12h14M12 5l7 7-7 7')],
  trophy: [p('M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2C7.8 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.2.6 2 2 2 3.8'), p('M18 2H6v7a6 6 0 0 0 12 0z')],
  refresh: [p('M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8'), p('M21 3v5h-5M3 21v-5h5')],
  // Two phones with signal arcs between them (nearby exchange).
  nearby: [r(2, 6, 7, 13, 1.5), r(15, 5, 7, 13, 1.5), p('M11 10.5a2.5 2.5 0 0 1 2 0M10.2 7.8a5 5 0 0 1 3.6 0')],
  chevronRight: [p('m9 18 6-6-6-6')],
  hash: [p('M4 9h16M4 15h16M10 3 8 21M16 3l-2 18')],
} satisfies Record<string, IconNode[]>;

export type IconName = keyof typeof ICONS;
