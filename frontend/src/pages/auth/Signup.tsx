import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { HeroPanel } from "./HeroPanel"
import { Button } from "@/components/ui/Button"
import { Input, Label } from "@/components/ui/Input"
import { AuthBackground } from "@/components/AuthBackground"
import { supabase } from "@/lib/supabase"

export function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError("Passwords do not match."); return }
    setLoading(true); setError("")
    const { data, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.name } } })
    if (authError) { setError(authError.message); setLoading(false); return }
    if (data.session) navigate("/requestor", { replace: true })
    else { setLoading(false); navigate("/login", { replace: true }) }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="relative isolate flex min-h-screen overflow-hidden">
      <AuthBackground />
      <HeroPanel
        headline="Get the support you need."
        subtext="Create your account to submit requests, track progress, and stay connected with IT support."
      />

      <div className="relative z-10 flex min-h-screen flex-[42] flex-col items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-xl bg-[#0071e3] flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[#1d1d1f]">
              IT Help Desk
            </span>
          </div>

          <h2 className="text-2xl font-semibold text-[#1d1d1f] mb-1">
            Create Account
          </h2>
          <p className="text-sm text-[#6e6e73] mb-8">
            Set up your support portal account
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Alex Rivera"
                value={form.name}
                onChange={set("name")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set("email")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={set("password")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={set("confirm")}
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              size="lg"
              disabled={loading}
            >
              {loading ? "Creating Account…" : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-[#6e6e73] mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#0071e3] font-medium hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
