import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { mapTicket, ticketSelect, type Category, type Department, type Profile, type Ticket } from "@/lib/tickets"

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("")
  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: queryError } = await supabase.from("tickets").select(ticketSelect).order("created_at", { ascending: false })
    if (queryError) setError(queryError.message); else { setTickets((data ?? []).map((row) => mapTicket(row as never))); setError("") }
    setLoading(false)
  }, [])
  useEffect(() => { void load() }, [load])
  return { tickets, loading, error, reload: load }
}

export function useCategories(includeInactive = false) {
  const [categories, setCategories] = useState<Category[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("")
  const load = useCallback(async () => {
    let query = supabase.from("categories").select("*").order("name")
    if (!includeInactive) query = query.eq("is_active", true)
    const { data, error: queryError } = await query
    if (queryError) setError(queryError.message); else { setCategories((data ?? []) as Category[]); setError("") }
    setLoading(false)
  }, [includeInactive])
  useEffect(() => { void load() }, [load])
  return { categories, loading, error, reload: load }
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("")
  const load = useCallback(async () => { const { data, error: e } = await supabase.from("departments").select("*").order("name"); if (e) setError(e.message); else { setDepartments((data ?? []) as Department[]); setError("") }; setLoading(false) }, [])
  useEffect(() => { void load() }, [load])
  return { departments, loading, error, reload: load }
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("")
  const load = useCallback(async () => { const { data, error: e } = await supabase.from("profiles").select("*").order("full_name"); if (e) setError(e.message); else { setProfiles((data ?? []) as Profile[]); setError("") }; setLoading(false) }, [])
  useEffect(() => { void load() }, [load])
  return { profiles, loading, error, reload: load }
}
