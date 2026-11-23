/**
 * Inline SVG icon paths (24×24 viewBox, stroke-based unless `fill` is set).
 * Hand-made for this project – no icon font or external assets.
 */
export interface IconPath {
  d: string
  fill?: boolean
}

export const icons = {
  back: [{ d: 'M15 5l-7 7 7 7' }],
  close: [{ d: 'M6 6l12 12M18 6L6 18' }],
  check: [{ d: 'M5 12.5l4.5 4.5L19 7.5' }],
  /** Magnifier with a tick: "check my entries". */
  inspect: [{ d: 'M10.5 3.5a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM15.5 15.5L21 21' }, { d: 'M7.5 10.5l2 2 3.5-4' }],
  plus: [{ d: 'M12 5v14M5 12h14' }],
  home: [{ d: 'M4 11l8-7 8 7M6 9.5V20h12V9.5' }],
  settings: [
    { d: 'M4 7h9M17 7h3M4 17h3M11 17h9' },
    { d: 'M15 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM9 15a2 2 0 1 1 0 4 2 2 0 0 1 0-4z' },
  ],
  stats: [{ d: 'M6 20v-7M12 20V5M18 20v-10M4 20h16' }],
  pencil: [{ d: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4' }],
  eraser: [
    { d: 'M7 20h13M4.4 14.6L13.2 5.8a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L10.8 18.4 9.6 19.6H7.4z' },
    { d: 'M9 10l5 5' },
  ],
  hint: [
    { d: 'M9.5 18h5M10.5 21h3' },
    { d: 'M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z' },
  ],
  restart: [{ d: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.8h3.8' }],
  menu: [
    { d: 'M12 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', fill: true },
    { d: 'M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', fill: true },
    { d: 'M12 20.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', fill: true },
  ],
  play: [{ d: 'M8 5v14l11-7z', fill: true }],
  pause: [{ d: 'M8.5 5v14M15.5 5v14' }],
  clock: [{ d: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7.5V12l3 2' }],
  trophy: [
    { d: 'M8 21h8M12 16.5V21M7 4h10v5a5 5 0 0 1-10 0z' },
    { d: 'M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3' },
  ],
  star: [{ d: 'M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z' }],
  starFilled: [
    { d: 'M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z', fill: true },
  ],
  download: [{ d: 'M12 4v11M7 10l5 5 5-5M5 20h14' }],
  upload: [{ d: 'M12 15V4M7 9l5-5 5 5M5 20h14' }],
  trash: [{ d: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3' }],
  chevronDown: [{ d: 'M6 9l6 6 6-6' }],
  info: [{ d: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 11v5M12 8h.01' }],
  external: [{ d: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5' }],
  grid: [{ d: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z' }],
  drag: [
    {
      d: 'M9 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM15 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM9 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM15 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM9 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM15 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
      fill: true,
    },
  ],
  undo: [{ d: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11' }],
  /** Share on Apple devices: box with an upward arrow. */
  share: [{ d: 'M12 15V3.5M8 7.5l4-4 4 4M8 10.5H6v10h12v-10h-2' }],
  /** Share on Android, Windows and others: three connected nodes. */
  shareNodes: [
    { d: 'M8.6 10.7l6.8-3.9M8.6 13.3l6.8 3.9' },
    {
      d: 'M18 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM6 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM18 15.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
    },
  ],
  addSquare: [{ d: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM12 8.5v7M8.5 12h7' }],
  mail: [{ d: 'M4 6h16v12H4zM4 7l8 6 8-6' }],
  lock: [{ d: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3' }],
  crown: [{ d: 'M5 18h14M5 15L3.5 7l5 4L12 5l3.5 6 5-4L19 15z' }],
} satisfies Record<string, IconPath[]>

export type IconName = keyof typeof icons
