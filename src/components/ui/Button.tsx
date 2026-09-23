import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "accent" | "play" | "stop" | "danger";
  /** Controls padding/text/height only - keep this consistent for anything sitting in the same row.
   * "icon" is a square button (no label) sized to match "sm" text buttons exactly. */
  size?: "sm" | "md" | "lg" | "icon";
  children: ReactNode;
}

// One height scale shared by every button in the app, so a text button and an icon-only button
// placed side by side always line up pixel-for-pixel.
const SIZE = {
  sm: "h-9 px-3.5 text-[11px] gap-1.5",
  md: "h-10 px-5 text-xs gap-2",
  lg: "h-16 px-10 text-lg gap-3",
  icon: "h-9 w-9 p-0 justify-center",
};

/** Blocky launcher button: pixel-font caps, thin frame and a thicker bottom edge in the frame color. */
export function Button({ variant = "ghost", size = "md", className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={clsx(
        "label-mc inline-flex items-center justify-center whitespace-nowrap border-2 border-b-4 transition-all cursor-pointer",
        "active:translate-y-px active:border-b-2 disabled:cursor-not-allowed disabled:opacity-50",
        SIZE[size],
        variant === "primary" && "bg-accent border-white/30 text-white hover:brightness-110",
        variant === "ghost" && "bg-black/30 border-accent/40 text-text hover:bg-accent/15 hover:border-accent/70",
        variant === "accent" && "bg-accent/15 border-accent/60 text-text hover:bg-accent/25",
        variant === "danger" && "bg-black/30 border-danger/50 text-danger hover:bg-danger/10",
        variant === "play" && "bg-accent/25 border-accent text-white hover:bg-accent/35",
        variant === "stop" && "bg-danger/25 border-danger text-white hover:bg-danger/35",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
