/** Brand mark: the same smooth "A" (two heavy legs and a crossbar) as the mod's LineIcons "mark", in the accent color. */
export function LarpMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="var(--accent-hex)"
      strokeWidth={9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 56 L32 8 L53 56" />
      <path d="M20 41 H44" />
    </svg>
  );
}
