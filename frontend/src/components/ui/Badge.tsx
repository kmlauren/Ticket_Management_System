import type {
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from "@/lib/tickets"

export function StatusBadge({
  status,
  label,
}: {
  status: TicketStatus
  label?: string
}) {
  const styles: Record<TicketStatus, string> = {
    Open: "bg-blue-50 text-blue-700 ring-blue-200",
    Assigned: "bg-amber-50 text-amber-700 ring-amber-200",
    Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {label ?? status}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const styles: Record<TicketPriority, string> = {
    Low: "bg-gray-100 text-gray-600 ring-gray-200",
    Medium: "bg-blue-50 text-blue-700 ring-blue-200",
    High: "bg-orange-50 text-orange-700 ring-orange-200",
    Critical: "bg-red-50 text-red-700 ring-red-200",
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[priority]}`}
    >
      {priority}
    </span>
  )
}

export function CategoryBadge({
  category,
}: {
  category: TicketCategory | string
}) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200">
      {category}
    </span>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    Admin: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    Developer: "bg-teal-50 text-teal-700 ring-teal-200",
    User: "bg-gray-100 text-gray-600 ring-gray-200",
    Requestor: "bg-gray-100 text-gray-600 ring-gray-200",
  }
  const cls = styles[role] ?? styles.Requestor
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {role}
    </span>
  )
}
