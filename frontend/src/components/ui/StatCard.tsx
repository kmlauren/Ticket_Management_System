interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color?: "blue" | "amber" | "green" | "gray"
}

export function StatCard({
  label,
  value,
  icon,
  color = "blue",
}: StatCardProps) {
  const iconColors = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
    gray: "bg-gray-100 text-gray-600",
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColors[color]}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-[#6e6e73] uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-semibold text-[#1d1d1f] mt-0.5">{value}</p>
      </div>
    </div>
  )
}
