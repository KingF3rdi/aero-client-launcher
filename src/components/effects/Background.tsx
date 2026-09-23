import { useThemeStore } from "../../store/useThemeStore";
import { ParticleField } from "./ParticleField";

/** App background: dark accent-tinted gradient plus the chosen effect (Settings -> Background). */
export function Background({ count = 60 }: { count?: number }) {
  const { accent, animations, background } = useThemeStore();
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: [
          "radial-gradient(ellipse at 30% 15%, rgb(var(--accent) / 0.10), transparent 55%)",
          "linear-gradient(to bottom right, #0d0b16, #07060b)",
        ].join(", "),
      }}
    >
      {background === "particles" && animations && (
        <div className="absolute inset-0 opacity-60">
          <ParticleField color={accent} count={count} />
        </div>
      )}
      {background === "grid" && (
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgb(var(--accent) / 0.12) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--accent) / 0.12) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      )}
    </div>
  );
}
