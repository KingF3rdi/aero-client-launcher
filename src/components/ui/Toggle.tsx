import clsx from "clsx";

interface ToggleProps {
  on: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Square pixel switch: framed track, white block knob. */
export function Toggle({ on, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={clsx(
        "relative w-10 h-5 border-2 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 shrink-0",
        on ? "bg-accent/70 border-accent" : "bg-black/40 border-white/25",
      )}
    >
      <span className={clsx("absolute top-0 left-0 w-4 h-4 bg-white transition-transform", on && "translate-x-5")} />
    </button>
  );
}
