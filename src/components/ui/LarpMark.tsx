import clsx from "clsx";

/** Same bolt-in-a-square brand mark as the Fabric mod's watermark (UiDraw.larpMark). */
export function LarpMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <div
      className={clsx("flex items-center justify-center rounded-lg border-2 border-accent bg-[#12121c]", className)}
      style={{ width: size, height: size, boxShadow: "0 0 16px rgba(79,142,255,0.4)" }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 10 10">
        <rect x="4" y="1" width="2" height="8" fill="#4f8eff" />
        <rect x="1" y="3.5" width="8" height="2" fill="#4f8eff" />
      </svg>
    </div>
  );
}
