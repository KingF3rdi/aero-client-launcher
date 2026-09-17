import clsx from "clsx";

interface ToggleProps {
  on: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ on, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={clsx(
        "relative w-11 h-6 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 shrink-0",
        on ? "bg-accent" : "bg-white/15",
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform",
          on && "translate-x-full",
        )}
      />
    </button>
  );
}
