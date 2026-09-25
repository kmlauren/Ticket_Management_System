import { createContext, useContext, useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import type { Profile } from "@/lib/tickets"

interface AuthValue { session: Session | null; profile: Profile | null; loading: boolean; error: string; refreshProfile: () => Promise<void> }
const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null), [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true), [error, setError] = useState("")
  async function loadProfile(userId?: string) {
    if (!userId) { setProfile(null); return }
    const { data, error: queryError } = await supabase.from("profiles").select("*").eq("id", userId).single()
    if (queryError) { setProfile(null); setError(queryError.message) } else { setProfile(data as Profile); setError("") }
  }
  async function refreshProfile() { await loadProfile(session?.user.id) }
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => { if (!mounted) return; setSession(data.session); await loadProfile(data.session?.user.id); if (mounted) setLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); void loadProfile(next?.user.id).finally(() => setLoading(false)) })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])
  return <AuthContext.Provider value={{ session, profile, loading, error, refreshProfile }}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value }
