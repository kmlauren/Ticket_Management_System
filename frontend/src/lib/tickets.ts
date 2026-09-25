export type UserRole = "user" | "developer" | "admin"
export type TicketStatusDb = "open" | "in_progress" | "resolved"
export type TicketStatus = "Open" | "Assigned" | "Resolved"
export type TicketPriorityDb = "low" | "medium" | "high" | "critical"
export type TicketPriority = "Low" | "Medium" | "High" | "Critical"
export type TicketCategory = string

export interface Profile { id: string; email: string; full_name: string; role: UserRole; department_id: string | null; is_active: boolean; created_at: string; updated_at: string }
export interface Department { id: string; name: string; email: string; status: "active" | "at_capacity" | "inactive"; created_at: string; updated_at: string }
export interface Category { id: string; name: string; description: string; department_id: string; is_active: boolean; created_at: string; updated_at: string }
export interface TicketActivity { id: string; ticket_id: string; activity_type: "created" | "assigned" | "reassigned" | "unassigned" | "status_changed"; actor_id: string | null; old_status: TicketStatusDb | null; new_status: TicketStatusDb | null; old_assignee_id: string | null; new_assignee_id: string | null; created_at: string }
export interface Ticket {
  id: string; ticket_number: string; subject: string; description: string; category_id: string; category: string
  priority: TicketPriority; priorityDb: TicketPriorityDb; status: TicketStatus; statusDb: TicketStatusDb
  requestor_id: string; requestor: string; requestorEmail: string; assigned_to: string | null; assignedTo?: string
  created_at: string; updated_at: string; resolved_at: string | null; created: string; updated: string
}

export const statusLabel = (status: TicketStatusDb): TicketStatus => status === "in_progress" ? "Assigned" : status === "open" ? "Open" : "Resolved"
export const priorityLabel = (priority: TicketPriorityDb): TicketPriority => `${priority[0].toUpperCase()}${priority.slice(1)}` as TicketPriority
export const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value))
export const formatDateTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
export const formatRelative = (value: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  return days < 7 ? `${days} day${days === 1 ? "" : "s"} ago` : formatDate(value)
}

type Joined<T> = T | T[] | null | undefined
const one = <T,>(value: Joined<T>): T | undefined => Array.isArray(value) ? value[0] : value ?? undefined
type TicketRow = Record<string, unknown> & { category?: Joined<{ name?: string }>; requestor?: Joined<{ full_name?: string; email?: string }>; assignee?: Joined<{ full_name?: string }> }
export function mapTicket(row: TicketRow): Ticket {
  const category = one(row.category), requestor = one(row.requestor), assignee = one(row.assignee)
  const priority = row.priority as TicketPriorityDb, status = row.status as TicketStatusDb
  return {
    id: row.id as string, ticket_number: row.ticket_number as string, subject: row.subject as string,
    description: row.description as string, category_id: row.category_id as string, category: category?.name ?? "Unknown",
    priority: priorityLabel(priority), priorityDb: priority, status: statusLabel(status), statusDb: status,
    requestor_id: row.requestor_id as string, requestor: requestor?.full_name ?? "Unknown user", requestorEmail: requestor?.email ?? "",
    assigned_to: (row.assigned_to as string | null) ?? null, assignedTo: assignee?.full_name,
    created_at: row.created_at as string, updated_at: row.updated_at as string, resolved_at: (row.resolved_at as string | null) ?? null,
    created: formatDate(row.created_at as string), updated: formatRelative(row.updated_at as string),
  }
}
export const ticketSelect = `id,ticket_number,subject,description,category_id,priority,status,requestor_id,assigned_to,created_at,updated_at,resolved_at,category:categories(name),requestor:profiles!tickets_requestor_id_fkey(full_name,email),assignee:profiles!tickets_assigned_to_fkey(full_name)`
