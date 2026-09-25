import { useCallback, useEffect, useState, type ReactNode } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  Bell,
  CheckCircle2,
  Code2,
  House,
  LifeBuoy,
  ListTodo,
  LogOut,
  Plus,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

type Role = "requestor" | "admin" | "developer"

interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

interface SidebarProps {
  role: Role
  userName?: string
  unreadCount?: number
}

interface LatestNotification {
  id: string
  title: string
  body: string
  ticket_id: string | null
  created_at: string
}

const roleNavItems: Record<Role, NavItem[]> = {
  requestor: [
    { label: "Dashboard", to: "/requestor", icon: House },
    { label: "My Requests", to: "/requestor/tickets", icon: ListTodo },
    { label: "Submit Request", to: "/requestor/create", icon: Plus },
    { label: "Notifications", to: "/requestor/notifications", icon: Bell },
  ],
  admin: [
    { label: "Dashboard", to: "/admin", icon: House },
    { label: "Tickets", to: "/admin/tickets", icon: ListTodo },
    { label: "Developers", to: "/admin/developers", icon: Code2 },
    { label: "Users", to: "/admin/users", icon: Users },
    { label: "Categories", to: "/admin/categories", icon: Tags },
    { label: "Notifications", to: "/admin/notifications", icon: Bell },
  ],
  developer: [
    { label: "Dashboard", to: "/developer", icon: House },
    { label: "My Tickets", to: "/developer/tickets", icon: ListTodo },
    { label: "Resolved", to: "/developer/resolved", icon: CheckCircle2 },
    { label: "Notifications", to: "/developer/notifications", icon: Bell },
  ],
}

function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [latest, setLatest] = useState<LatestNotification | null>(null)

  const reload = useCallback(async () => {
    const { data, count } = await supabase
      .from("notifications")
      .select("id,title,body,ticket_id,created_at", { count: "exact" })
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(1)

    setUnreadCount(count ?? 0)
    setLatest(((data ?? [])[0] as LatestNotification | undefined) ?? null)
  }, [])

  useEffect(() => {
    void reload()
    const timer = window.setInterval(() => void reload(), 30000)
    const onUpdate = () => void reload()
    const onVisibility = () => {
      if (document.visibilityState === "visible") void reload()
    }

    window.addEventListener("notifications-updated", onUpdate)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener("notifications-updated", onUpdate)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [reload])

  return { unreadCount, latest }
}

export function Sidebar({ role, userName, unreadCount = 0 }: SidebarProps) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const displayName = profile?.full_name ?? userName ?? "User"
  const roleLabel = role[0].toUpperCase() + role.slice(1)
  const initials = displayName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col border-r border-[#e5e5ea] bg-white">
      <div className="border-b border-[#f0f0f2] px-5 pb-5 pt-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#0071e3]">
            <LifeBuoy className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-[#1d1d1f]">IT Help Desk</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#aeaeb2]">Support Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {roleNavItems[role].map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === `/${role}`}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-50 text-[#0071e3]"
                  : "text-[#6e6e73] hover:bg-gray-50 hover:text-[#1d1d1f]"
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="flex-1">{label}</span>
            {label === "Notifications" && unreadCount > 0 && (
              <span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[#f0f0f2] px-3 pb-4 pt-3">
        <div className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#1d1d1f]">{displayName}</p>
            <p className="truncate text-xs text-[#aeaeb2]">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut()
              navigate("/login", { replace: true })
            }}
            className="text-[#aeaeb2] opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  )
}

export function AppShell({
  children,
  ...sidebarProps
}: Omit<SidebarProps, "unreadCount"> & { children: ReactNode }) {
  const navigate = useNavigate()
  const { unreadCount, latest } = useUnreadNotifications()

  return (
    <div className="flex h-screen bg-[#F5F5F7]">
      <Sidebar {...sidebarProps} unreadCount={unreadCount} />
      <main className="flex-1 overflow-y-auto">
        {latest && (
          <div className="flex items-center gap-3 border-b border-blue-100 bg-blue-50 px-8 py-3 text-sm text-blue-900">
            <Bell className="h-4 w-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-semibold">{latest.title}</span>
              <span className="ml-2 text-blue-700">{latest.body}</span>
            </div>
            <button
              type="button"
              className="font-medium text-[#0071e3] hover:underline"
              onClick={() => navigate(`/${sidebarProps.role}/notifications`)}
            >
              View notifications
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
