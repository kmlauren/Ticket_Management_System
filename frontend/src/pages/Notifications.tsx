import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AppShell } from "@/layouts/Sidebar"
import { PageHeader } from "@/layouts/PageHeader"
import { Button } from "@/components/ui/Button"
import { NotificationCard } from "@/components/ui/NotificationCard"
import { PageError, PageLoading } from "@/components/ui/PageState"
import { supabase } from "@/lib/supabase"

interface Notification {
  id: string
  title: string
  body: string
  ticket_id: string | null
  read_at: string | null
  created_at: string
}

type NotificationRole = "requestor" | "admin" | "developer"

export function Notifications({ role = "requestor" }: { role?: NotificationRole }) {
  const navigate = useNavigate()
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    const { data, error: loadError } = await supabase
      .from("notifications")
      .select("id,title,body,ticket_id,read_at,created_at")
      .order("created_at", { ascending: false })

    if (loadError) setError(loadError.message)
    else {
      setItems((data ?? []) as Notification[])
      setError("")
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function read(id?: string) {
    let query = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)

    if (id) query = query.eq("id", id)

    const { error: readError } = await query
    if (readError) {
      setError(readError.message)
      return
    }

    await load()
    window.dispatchEvent(new Event("notifications-updated"))
  }

  async function openNotification(item: Notification) {
    if (!item.read_at) await read(item.id)
    if (item.ticket_id) navigate(`/${role}/tickets/${item.ticket_id}`)
  }

  if (loading) return <AppShell role={role}><PageLoading /></AppShell>
  if (error) return <AppShell role={role}><PageError message={error} /></AppShell>

  const unread = items.filter((item) => !item.read_at).length

  return (
    <AppShell role={role}>
      <div className="max-w-6xl px-8 py-8">
        <PageHeader
          title="Notifications"
          subtitle="Stay updated on your support requests."
          action={unread ? (
            <Button variant="secondary" size="sm" onClick={() => read()}>Mark all as read</Button>
          ) : undefined}
        />
        {!items.length && (
          <p className="rounded-2xl border border-[#e5e5ea] bg-white p-12 text-center text-sm text-[#aeaeb2] shadow-sm">
            No notifications yet
          </p>
        )}
        <div className="space-y-3">
          {items.map((item) => (
            <NotificationCard
              key={item.id}
              title={item.title}
              body={item.body}
              createdAt={item.created_at}
              read={!!item.read_at}
              clickable={!!item.ticket_id}
              onClick={() => void openNotification(item)}
            />
          ))}
        </div>
      </div>
    </AppShell>
  )
}
