import { useNavigate } from "react-router-dom"
import type { Ticket } from "@/lib/tickets"
import { StatusBadge } from "./Badge"
import { PriorityBadge } from "./Badge"
import { CategoryBadge } from "./Badge"
import { ListTodo } from "lucide-react"

interface Column {
  key: keyof Ticket
  label: string
  render?: (ticket: Ticket) => React.ReactNode
}

interface TicketTableProps {
  tickets: Ticket[]
  columns?: Column[]
  detailRoute?: (id: string) => string
}

const defaultColumns: Column[] = [
  {
    key: "id",
    label: "Ticket ID",
    render: (t) => (
      <span className="font-mono text-xs font-medium text-[#6e6e73]">
        #{t.id}
      </span>
    ),
  },
  {
    key: "subject",
    label: "Subject",
    render: (t) => (
      <span className="font-medium text-[#1d1d1f] text-sm">{t.subject}</span>
    ),
  },
  {
    key: "category",
    label: "Category",
    render: (t) => <CategoryBadge category={t.category} />,
  },
  {
    key: "priority",
    label: "Priority",
    render: (t) => <PriorityBadge priority={t.priority} />,
  },
  {
    key: "status",
    label: "Status",
    render: (t) => <StatusBadge status={t.status} />,
  },
  {
    key: "updated",
    label: "Updated",
    render: (t) => <span className="text-sm text-[#6e6e73]">{t.updated}</span>,
  },
]

export function TicketTable({
  tickets,
  columns = defaultColumns,
  detailRoute,
}: TicketTableProps) {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f0f0f2]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-5 py-3.5 text-left text-xs font-semibold text-[#aeaeb2] uppercase tracking-wider whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f5f5f7]">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <ListTodo
                      className="h-10 w-10 text-[#d2d2d7]"
                      strokeWidth={1.5}
                    />
                    <p className="text-sm text-[#aeaeb2]">No tickets found</p>
                  </div>
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() =>
                    detailRoute && navigate(detailRoute(ticket.id))
                  }
                  className={`${
                    detailRoute
                      ? "cursor-pointer hover:bg-[#f9f9fb] transition-colors"
                      : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-4 whitespace-nowrap">
                      {col.render
                        ? col.render(ticket)
                        : String(ticket[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
