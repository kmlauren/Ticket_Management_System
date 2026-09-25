import { type ButtonHTMLAttributes, type ReactNode } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost"
  size?: "sm" | "md" | "lg"
  children: ReactNode
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"

  const variants = {
    primary:
      "bg-[#0071e3] text-white hover:bg-[#0077ed] active:bg-[#0065cc] focus-visible:ring-blue-500 shadow-sm",
    secondary:
      "bg-white text-[#1d1d1f] border border-[#d2d2d7] hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-400",
    destructive:
      "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-500 shadow-sm",
    ghost:
      "text-[#0071e3] hover:bg-blue-50 active:bg-blue-100 focus-visible:ring-blue-500",
  }

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
