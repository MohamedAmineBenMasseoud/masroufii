const SVG = (body, size = 20) => `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    ${body}
  </svg>
`;

const ICONS = {
  home: `<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>`,
  history: `<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4v4.5H8"/><path d="M12 7.5V12l3 2"/>`,
  wallet: `<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><path d="M4 7.5V17a2 2 0 0 0 2 2h12.5a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5z"/><circle cx="16" cy="13.5" r="1.1"/>`,
  user: `<circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  minus: `<path d="M5 12h14"/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7.5"/>`,
  alert: `<path d="M12 3 2.8 20h18.4L12 3z"/><path d="M12 9v4M12 16h.01"/>`,
  back: `<path d="M14.5 5.5 8 12l6.5 6.5"/>`,
  chev: `<path d="M9.5 5.5 16 12l-6.5 6.5"/>`,
  chevd: `<path d="M5.5 9.5 12 16l6.5-6.5"/>`,
  up: `<path d="M6 14.5 12 8.5l6 6"/><path d="M6 19.5 12 13.5l6 6" opacity="0.5"/>`,
  pencil: `<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/>`,
  trash: `<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>`,
  backspace: `<path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>`,
  export: `<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 13v6h14v-6"/>`,
  import: `<path d="M12 4v11M8 11l4 4 4-4"/><path d="M5 19h14"/>`,
  globe: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>`,
  cal: `<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>`,
  cal2: `<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/><path d="M8.5 13.5h7M8.5 17h4"/>`,
  target: `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>`,
  coins: `<ellipse cx="12" cy="6.5" rx="7" ry="2.8"/><path d="M5 6.5v5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-5"/><path d="M5 11.5v5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-5"/>`,
  food: `<path d="M8 3v8M5 3v5a3 3 0 0 0 6 0V3M8 11v10"/><path d="M17 3c-2 2-2.5 5-2.5 8H17v10"/>`,
  drop: `<path d="M12 3.5c3.5 4.2 6 7 6 10a6 6 0 0 1-12 0c0-3 2.5-5.8 6-10z"/>`,
  car: `<path d="M4 16v-4l2.2-5.5h11.6L20 12v4z"/><path d="M4 12h16"/><path d="M6.5 16v2.5M17.5 16v2.5"/>`,
  book: `<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5-.7 1.5-1.5z"/>`,
  phone: `<rect x="7" y="3" width="10" height="18" rx="2.2"/><path d="M11 18h2"/>`,
  play: `<path d="M8 5.5v13l10-6.5z"/>`,
  bag: `<path d="M6 8h12l-1 12H7z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>`,
  cup: `<path d="M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 10h1.5a2 2 0 0 1 0 4H16"/><path d="M8 4v2M11 4v2"/>`,
  snack: `<circle cx="12" cy="12" r="8"/><path d="M9 9h.01M14 8h.01M15 13h.01M10 15h.01" stroke-width="2.4"/>`,
  dots: `<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>`,
  palette: `<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-1 1.5-2.2-.5-1.3.3-2.3 1.7-2.3H17a3.5 3.5 0 0 0 3.5-3.5C20.5 7 16.8 3.5 12 3.5z"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="7.8" r="1"/><circle cx="16" cy="11" r="1"/>`,
  bell: `<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>`,
  lock: `<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>`,
};

export function icon(name, size = 20) {
  const svgBody = ICONS[name];
  return svgBody ? SVG(svgBody, size) : "";
}

export const iconNames = Object.keys(ICONS);
