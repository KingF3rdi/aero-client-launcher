import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "play" | "stop";
  children: ReactNode;
}

export function Button({ variant = "ghost", className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent text-[#1a1024] hover:bg-white hover:shadow-glow",
        variant === "ghost" && "bg-white/5 border border-white/10 text-text hover:bg-white/10 backdrop-blur",
        variant === "play" &&
          "bg-green text-[#07210f] font-bold px-8 py-3 text-base hover:brightness-110 shadow-[0_0_20px_rgba(61,255,138,0.35)]",
        variant === "stop" &&
          "bg-danger text-white font-bold px-8 py-3 text-base hover:brightness-110 shadow-[0_0_20px_rgba(224,85,85,0.35)]",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
