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
  lg: "h-14 px-10 text-base gap-3",
  icon: "h-9 w-9 p-0",
};

/** Flat launcher button: pixel-font caps, 1px frame, solid accent for the main actions. */
export function Button({ variant = "ghost", size = "md", className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={clsx(
        "label-mc inline-flex items-center justify-center whitespace-nowrap border transition-colors cursor-pointer",
        "disabled:cursor-not-allowed disabled:opacity-50",
        SIZE[size],
        (variant === "primary" || variant === "play") && "bg-accent border-accent text-white hover:brightness-110",
        variant === "ghost" && "bg-white/5 border-white/15 text-text hover:border-accent/60 hover:bg-accent/10",
        variant === "accent" && "bg-accent/15 border-accent/50 text-text hover:bg-accent/25",
        variant === "danger" && "bg-transparent border-danger/50 text-danger hover:bg-danger/10",
        variant === "stop" && "bg-danger border-danger text-white hover:brightness-110",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
