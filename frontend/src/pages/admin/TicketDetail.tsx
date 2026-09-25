import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { AppShell } from "@/layouts/Sidebar"
import { BackLink } from "@/layouts/PageHeader"
import { Button } from "@/components/ui/Button"
import { CategoryBadge, PriorityBadge, StatusBadge } from "@/components/ui/Badge"
import { PageError, PageLoading } from "@/components/ui/PageState"
import { Select } from "@/components/ui/Input"
import { supabase } from "@/lib/supabase"
import { formatDateTime, mapTicket, ticketSelect, type Profile, type Ticket, type TicketActivity } from "@/lib/tickets"

const cardClass = "rounded-2xl border border-[#e5e5ea] bg-white p-6 shadow-sm"

type DeveloperCategoryRow = { developer_id: string }

export function AdminTicketDetail() {
  const { id } = useParams()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [developers, setDevelopers] = useState<Profile[]>([])
  const [activity, setActivity] = useState<TicketActivity[]>([])
  const [selected, setSelected] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function load() {
    setError("")
    const { data, error: ticketError } = await supabase
      .from("tickets")
      .select(ticketSelect)
      .eq("id", id)
      .maybeSingle()

    if (ticketError || !data) {
      setError(ticketError?.message ?? "Ticket not found.")
      setLoading(false)
      return
    }

    const nextTicket = mapTicket(data as never)
    setTicket(nextTicket)
    setSelected(nextTicket.assigned_to ?? "")

    const { data: categoryAssignments, error: assignmentError } = await supabase
      .from("developer_categories")
      .select("developer_id")
      .eq("category_id", nextTicket.category_id)

    if (assignmentError) {
      setError(assignmentError.message)
      setLoading(false)
      return
    }

    const developerIds = ((categoryAssignments ?? []) as DeveloperCategoryRow[])
      .map((row) => row.developer_id)

    if (developerIds.length === 0) {
      setDevelopers([])
    } else {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "developer")
        .eq("is_active", true)
        .in("id", developerIds)
        .order("full_name")

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      setDevelopers((profiles ?? []) as Profile[])
    }

    const { data: events, error: activityError } = await supabase
      .from("ticket_activity")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at")

    if (activityError) setError(activityError.message)
    setActivity((events ?? []) as TicketActivity[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [id])

  async function assign() {
    if (!ticket) return
    setSaving(true)
    setError("")

    const payload: { assigned_to: string | null; status?: "open" | "in_progress" } = {
      assigned_to: selected || null,
    }

    // Assignment and the user-facing "Assigned" status should happen together.
    if (selected && ticket.statusDb === "open") payload.status = "in_progress"
    if (!selected && ticket.statusDb === "in_progress") payload.status = "open"

    const { error: updateError } = await supabase
      .from("tickets")
      .update(payload)
      .eq("id", id)

    if (updateError) setError(updateError.message)
    else {
      await load()
      window.dispatchEvent(new Event("notifications-updated"))
    }
    setSaving(false)
  }

  async function changeStatus(value: string) {
    const { error: updateError } = await supabase.from("tickets").update({ status: value }).eq("id", id)
    if (updateError) setError(updateError.message)
    else {
      await load()
      window.dispatchEvent(new Event("notifications-updated"))
    }
  }

  if (loading) return <AppShell role="admin"><PageLoading /></AppShell>
  if (error || !ticket) return <AppShell role="admin"><PageError message={error || "Not found"} /></AppShell>

  const nextStatuses = ticket.statusDb === "open"
    ? (ticket.assigned_to ? ["open", "in_progress"] : ["open"])
    : ticket.statusDb === "in_progress"
      ? ["in_progress", "resolved"]
      : ["resolved", "open"]

  return (
    <AppShell role="admin">
      <div className="max-w-4xl px-8 py-8">
        <BackLink to="/admin/tickets" label="Back to Tickets" />
        <div className={`${cardClass} mb-5`}>
          <p className="font-mono text-xs">#{ticket.ticket_number}</p>
          <div className="flex justify-between">
            <h1 className="text-xl font-semibold">{ticket.subject}</h1>
            <StatusBadge status={ticket.status} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-5">
            <div className={cardClass}>
              <CategoryBadge category={ticket.category} />
              <div className="mt-3"><PriorityBadge priority={ticket.priority} /></div>
              <p className="mt-4 text-sm">Requestor: {ticket.requestor} · {ticket.requestorEmail}</p>
              <p className="mt-4 border-t pt-4 text-sm">{ticket.description}</p>
            </div>
            <div className={cardClass}>
              <h2 className="mb-4 font-semibold">Activity</h2>
              {activity.map((item) => (
                <div key={item.id} className="mb-3 border-l-2 pl-4 text-sm">
                  {item.activity_type.replaceAll("_", " ")}
                  <p className="text-xs text-[#aeaeb2]">{formatDateTime(item.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className={`${cardClass} p-5`}>
              <h2 className="mb-3 font-semibold">Assign Developer</h2>
              <Select value={selected} onChange={(event) => setSelected(event.target.value)}>
                <option value="">Unassigned</option>
                {developers.map((developer) => (
                  <option key={developer.id} value={developer.id}>{developer.full_name}</option>
                ))}
              </Select>
              {!developers.length && (
                <p className="mt-2 text-sm text-[#6e6e73]">No developers are assigned to this ticket category.</p>
              )}
              <Button className="mt-3 w-full" disabled={saving} onClick={assign}>Save Assignment</Button>
            </div>
            <div className={`${cardClass} p-5`}>
              <h2 className="mb-3 font-semibold">Status</h2>
              <Select value={ticket.statusDb} onChange={(event) => changeStatus(event.target.value)}>
                {nextStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status === "in_progress" ? "Assigned" : status.replace(/^./, (character) => character.toUpperCase())}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
