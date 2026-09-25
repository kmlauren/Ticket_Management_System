import { type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

interface BackLinkProps {
  to: string
  label: string
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1f]">{title}</h1>
        {subtitle && <p className="text-sm text-[#6e6e73] mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  )
}

export function BackLink({ to, label }: BackLinkProps) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-1.5 text-sm text-[#0071e3] hover:underline mb-4"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  )
}
