import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AppShell } from "@/layouts/Sidebar"
import { PageHeader } from "@/layouts/PageHeader"
import { Button } from "@/components/ui/Button"
import { Input, Textarea, Select, FormField } from "@/components/ui/Input"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useCategories } from "@/hooks/useData"

type TicketDraft = {
  subject: string
  category: string
  priority: string
  description: string
}

const emptyDraft: TicketDraft = { subject: "", category: "", priority: "", description: "" }

export function CreateTicket() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { categories } = useCategories()
  const storageKey = profile ? `ticket-draft:${profile.id}` : "ticket-draft"
  const [form, setForm] = useState<TicketDraft>(emptyDraft)
  const [restored, setRestored] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const isDirty = useMemo(
    () => Object.values(form).some((value) => value.trim() !== ""),
    [form],
  )

  useEffect(() => {
    if (!profile || restored) return
    const saved = sessionStorage.getItem(storageKey)
    if (saved) {
      try {
        setForm({ ...emptyDraft, ...JSON.parse(saved) })
      } catch {
        sessionStorage.removeItem(storageKey)
      }
    }
    setRestored(true)
  }, [profile, restored, storageKey])

  useEffect(() => {
    if (!restored) return
    if (isDirty) sessionStorage.setItem(storageKey, JSON.stringify(form))
    else sessionStorage.removeItem(storageKey)
  }, [form, isDirty, restored, storageKey])

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty || saving) return
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [isDirty, saving])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!profile) return

    setSaving(true)
    setError("")

    const { data, error: submitError } = await supabase
      .from("tickets")
      .insert({
        subject: form.subject,
        description: form.description,
        category_id: form.category,
        priority: form.priority.toLowerCase(),
        requestor_id: profile.id,
      })
      .select("id")
      .single()

    if (submitError) {
      setError(submitError.message)
      setSaving(false)
      return
    }

    sessionStorage.removeItem(storageKey)
    setForm(emptyDraft)
    navigate(`/requestor/tickets/${data.id}`, { replace: true })
  }

  function set(key: keyof TicketDraft) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }))
    }
  }

  function cancel() {
    if (isDirty && !window.confirm("Discard the unsaved ticket information?")) return
    sessionStorage.removeItem(storageKey)
    setForm(emptyDraft)
    navigate("/requestor")
  }

  return (
    <AppShell role="requestor">
      <div className="max-w-2xl px-8 py-8">
        <PageHeader title="Submit Request" subtitle="Tell us what you need help with." />
        <div className="rounded-2xl border bg-white p-8">
          <form onSubmit={submit} className="space-y-6">
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <FormField label="Subject" required>
              <Input value={form.subject} onChange={set("subject")} required />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Category" required>
                <Select value={form.category} onChange={set("category")} required>
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Priority" required>
                <Select value={form.priority} onChange={set("priority")} required>
                  <option value="">Select priority</option>
                  {["Low", "Medium", "High", "Critical"].map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </Select>
              </FormField>
            </div>
            <FormField label="Description" required>
              <Textarea rows={6} value={form.description} onChange={set("description")} required />
            </FormField>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={cancel}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit Request"}</Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
