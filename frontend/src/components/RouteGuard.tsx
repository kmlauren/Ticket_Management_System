import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import type { UserRole } from "@/lib/tickets"
export const homeForRole = (role: UserRole) => role === "user" ? "/requestor" : `/${role}`
export function LoadingScreen() { return <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7] text-sm text-[#6e6e73]">Loading…</div> }
export function RoleRoute({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { session, profile, loading } = useAuth(), location = useLocation()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!profile || !profile.is_active) return <Navigate to="/login" replace />
  if (profile.role !== role) return <Navigate to={homeForRole(profile.role)} replace />
  return children
}
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (session && profile?.is_active) return <Navigate to={homeForRole(profile.role)} replace />
  return children
}
