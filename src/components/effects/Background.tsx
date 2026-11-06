import { useThemeStore } from "../../store/useThemeStore";
import { ParticleField } from "./ParticleField";

/** App background: the chosen effect (Settings -> Background). Dusk is the mod's title-screen sky. */
export function Background({ count = 60 }: { count?: number }) {
  const { accent, animations, background } = useThemeStore();
  if (background === "dusk") {
    return <DuskSky />;
  }
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

/** Sunset gradient, a low sun and three mountain ridges, dimmed so the cards on top stay readable. */
function DuskSky() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ background: "linear-gradient(180deg, #1b1a2b 0%, #33294a 40%, #6e4862 72%, #a96d6a 100%)" }}
    >
      <div
        className="absolute left-1/2 bottom-[30%] w-64 h-64 -ml-32 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,226,170,.8) 0 34%, rgba(255,200,150,.2) 54%, transparent 70%)" }}
      />
      <svg className="absolute inset-x-0 bottom-0 w-full h-[45%]" viewBox="0 0 1440 360" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 170 C160 120 300 150 440 110 S760 60 900 120 S1200 90 1440 130 V360 H0 Z" fill="#634862" opacity="0.8" />
        <path d="M0 230 C200 180 360 240 560 200 S900 170 1080 220 S1320 190 1440 210 V360 H0 Z" fill="#443550" />
        <path d="M0 290 C220 260 420 300 640 280 S1040 250 1240 285 S1400 280 1440 275 V360 H0 Z" fill="#262030" />
      </svg>
      <div className="absolute inset-0 bg-[#0a090e]/45" />
    </div>
  );
}
