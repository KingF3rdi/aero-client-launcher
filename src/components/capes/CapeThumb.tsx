const CAPE_API = "https://aero.gamekni9ht.workers.dev/api/capes";

/** Crops a 64x32 cape PNG down to its visible 10x16 front panel (top-left corner), scaled up. */
export function CapeThumb({ id, scale = 4, className }: { id: number; scale?: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: 10 * scale,
        height: 16 * scale,
        backgroundImage: `url(${CAPE_API}/${id}.png)`,
        backgroundSize: `${64 * scale}px ${32 * scale}px`,
        backgroundPosition: "0 0",
        imageRendering: "pixelated",
      }}
    />
  );
}
