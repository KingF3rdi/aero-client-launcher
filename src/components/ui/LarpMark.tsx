import { useId } from "react";

/**
 * Brand mark: the same smooth "A" (two heavy legs and a crossbar) as the mod's LineIcons "mark".
 * tone "accent" uses the accent color, "metal" a white-to-steel gradient for the monochrome home.
 */
export function LarpMark({ size = 36, className, tone = "accent" }: { size?: number; className?: string; tone?: "accent" | "metal" }) {
  const gid = useId();
  const stroke = tone === "metal" ? `url(#${gid})` : "var(--accent-hex)";
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke={stroke}
      strokeWidth={9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {tone === "metal" && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#c9cad2" />
            <stop offset="1" stopColor="#7d7f8a" />
          </linearGradient>
        </defs>
      )}
      <path d="M11 56 L32 8 L53 56" />
      <path d="M20 41 H44" />
    </svg>
  );
}
