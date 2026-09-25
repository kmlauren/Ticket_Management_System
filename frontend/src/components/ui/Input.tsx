import {
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  forwardRef,
} from "react"
import { Search } from "lucide-react"

const inputBase =
  "w-full rounded-xl border border-[#d2d2d7] bg-white px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#aeaeb2] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 transition-all"

export const Input =
  forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
    ({ className = "", ...props }, ref) => (
      <input ref={ref} className={`${inputBase} ${className}`} {...props} />
    ),
  )
Input.displayName = "Input"

export function SearchInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aeaeb2]" />
      <input className={`${inputBase} pl-9 ${className}`} {...props} />
    </div>
  )
}

export const Textarea =
  forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
    ({ className = "", ...props }, ref) => (
      <textarea
        ref={ref}
        className={`${inputBase} resize-none ${className}`}
        {...props}
      />
    ),
  )
Textarea.displayName = "Textarea"

export const Select =
  forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
    ({ className = "", children, ...props }, ref) => (
      <select
        ref={ref}
        className={`${inputBase} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%236e6e73' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_12px_center] bg-[length:16px] pr-9 cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    ),
  )
Select.displayName = "Select"

export function Label({
  children,
  htmlFor,
  required,
}: {
  children: React.ReactNode
  htmlFor?: string
  required?: boolean
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold text-[#6e6e73] uppercase tracking-wide mb-1.5"
    >
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

export function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label required={required}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-[#6e6e73]">{hint}</p>}
    </div>
  )
}
