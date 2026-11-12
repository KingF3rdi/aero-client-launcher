import type { CSSProperties } from "react";

/**
 * Bundled line icons in the same style as the mod's menu icons (round 1.8px strokes on a 24 grid).
 * Drop-in for the old @iconify/react Icon: same props, names like "solar:play-bold" are matched by their
 * middle part. Iconify fetched every icon from the internet at runtime - slow to appear and gone offline.
 * Names ending in -bold fill play/stop/pin; everything else stays an outline.
 */
const PATHS: Record<string, string> = {
  "add-circle": '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  "add-square": '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>',
  "alt-arrow-down": '<path d="M6 9l6 6 6-6"/>',
  "alt-arrow-up": '<path d="M6 15l6-6 6 6"/>',
  box: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  cat: '<path d="M5 20v-8L4 5l4.5 3h7L20 5l-1 7v8z"/><path d="M9.5 14h.01M14.5 14h.01"/>',
  "check-circle": '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
  "check-read": '<path d="M2 13l4 4 8-9M12 15l2 2 8-9"/>',
  "close-circle": '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  "close-square": '<path d="M7 7l10 10M17 7L7 17"/>',
  "code-file":
    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M10 13l-2 2 2 2M14 13l2 2-2 2"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  crown: '<path d="M4 18h16M4.5 15L3 7l5 4 4-6 4 6 5-4-1.5 8z"/>',
  "danger-triangle": '<path d="M12 4L2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>',
  "document-text":
    '<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5M8.5 13h7M8.5 17h5"/>',
  "download-minimalistic": '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  "upload-minimalistic": '<path d="M12 15V4M7 9l5-5 5 5M5 20h14"/>',
  "folder-open": '<path d="M3 18V7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v1"/><path d="M3 18l3-8h15l-3 8z"/>',
  gallery: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-8 9"/>',
  import: '<path d="M12 3v11M7 9l5 5 5-5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  leaf: '<path d="M5 19C5 11 10 5 20 5c0 10-6 15-15 14z"/><path d="M5 19l7-7"/>',
  "magic-stick-3": '<path d="M4 20L15 9"/><path d="M17 3v3M15.5 4.5h3M20 9v2M19 10h2M12 4v1.6M11.2 4.8h1.6"/>',
  magnifer: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  "maximize-square": '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  "minus-square": '<path d="M6 12h12"/>',
  "pallete-2":
    '<path d="M12 3a9 9 0 0 0 0 18c1.4 0 2-1 2-2s-.6-1.5-.6-2.5 1-2 2.5-2H18a3 3 0 0 0 3-3c0-4.6-4-8.5-9-8.5z"/><path d="M7.5 11h.01M10 7h.01M15 7.5h.01"/>',
  pin: '<path d="M9 4h6l-1 5 3 3v2H7v-2l3-3z"/><path d="M12 14v6"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4h-4"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  stars: '<path d="M11 3l1.8 4.7 4.7 1.8-4.7 1.8L11 16l-1.8-4.7L4.5 9.5l4.7-1.8z"/><path d="M18 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  sunset: '<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 6v3M5 10l1.5 1.5M19 10l-1.5 1.5M8 21h8"/>',
  "t-shirt": '<path d="M8 4L3 7l2 4 2-1v10h10V10l2 1 2-4-5-3c0 1.7-1.8 3-4 3S8 5.7 8 4z"/>',
  "trash-bin-trash": '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  "tuning-2": '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  "user-id":
    '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 10h4M14 13h3"/>',
  widget: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  // pixel set used by the login window buttons
  "minus-solid": '<path d="M6 12h12"/>',
  "window-close-solid": '<path d="M7 7l10 10M17 7L7 17"/>',
};
PATHS["widget-5"] = PATHS.widget;

const FILLED = new Set(["play", "stop", "pin"]);

interface IconProps {
  icon: string;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ icon, width = 20, height = 20, className, style }: IconProps) {
  const full = icon.includes(":") ? icon.slice(icon.indexOf(":") + 1) : icon;
  const bold = full.endsWith("-bold");
  const base = full.replace(/-(bold|linear)$/, "");
  const markup = PATHS[base] ?? PATHS[full] ?? '<circle cx="12" cy="12" r="3"/>';
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill={bold && FILLED.has(base) ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
