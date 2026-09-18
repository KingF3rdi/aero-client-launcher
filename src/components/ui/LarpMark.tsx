/** Brand mark: a plain bold blue "A", same as the Fabric mod's UiDraw.aeroMark. */
export function LarpMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#4f8eff",
        fontSize: size * 0.95,
        fontWeight: 900,
        lineHeight: 1,
        textShadow: "0 0 16px rgba(79,142,255,0.55)",
      }}
    >
      A
    </div>
  );
}
