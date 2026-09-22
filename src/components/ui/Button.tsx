import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "accent" | "play" | "stop" | "danger";
  /** Controls padding/text/height only - keep this consistent for anything sitting in the same row.
   * "icon" is a square button (no label) sized to match "sm"/"md" text buttons exactly. */
  size?: "sm" | "md" | "lg" | "icon";
  children: ReactNode;
}

// One height scale shared by every button in the app, so a text button and an icon-only button
// placed side by side (e.g. the instance action row) always line up pixel-for-pixel.
const SIZE = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-10 px-5 text-sm gap-2",
  lg: "h-14 px-8 text-lg gap-2.5",
  icon: "h-9 w-9 p-0 justify-center",
};

export function Button({ variant = "ghost", size = "md", className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-xl font-medium transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        SIZE[size],
        variant === "primary" && "bg-accent text-[#1a1024] hover:bg-white hover:shadow-glow",
        variant === "ghost" && "bg-white/5 border border-white/10 text-text hover:bg-white/10 backdrop-blur",
        variant === "accent" && "bg-accent/15 border border-accent/40 text-accent hover:bg-accent/25",
        variant === "danger" && "bg-white/5 border border-danger/30 text-danger hover:bg-danger/10 backdrop-blur",
        variant === "play" && "bg-green text-[#07210f] font-bold hover:brightness-110 shadow-[0_0_20px_rgba(61,255,138,0.35)]",
        variant === "stop" && "bg-danger text-white font-bold hover:brightness-110 shadow-[0_0_20px_rgba(224,85,85,0.35)]",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
