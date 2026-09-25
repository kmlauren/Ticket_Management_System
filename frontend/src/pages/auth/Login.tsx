import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { HeroPanel } from "./HeroPanel"
import { Button } from "@/components/ui/Button"
import { Input, Label } from "@/components/ui/Input"
import { AuthBackground } from "@/components/AuthBackground"
import { supabase } from "@/lib/supabase"
import { homeForRole } from "@/components/RouteGuard"

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError("")
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_active").eq("id", data.user.id).single()
    if (profileError || !profile?.is_active) { await supabase.auth.signOut(); setError(profileError?.message ?? "Your account is inactive."); setLoading(false); return }
    navigate(homeForRole(profile.role), { replace: true })
  }

  return (
    <div className="relative isolate flex min-h-screen overflow-hidden">
      <AuthBackground />
      <HeroPanel
        headline="Support, simplified."
        subtext="Submit requests, track progress, and get the IT support you need—all in one place."
      />

      {/* Right login section */}
      <div className="relative z-10 flex min-h-screen flex-[42] flex-col items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Branding */}
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
            Welcome Back
          </h2>
          <p className="text-sm text-[#6e6e73] mb-8">
            Sign in to your support portal
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aeaeb2] hover:text-[#6e6e73] transition-colors"
                >
                  {showPass ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              size="lg"
              disabled={loading}
            >
              {loading ? "Signing In…" : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-[#6e6e73] mt-6">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-[#0071e3] font-medium hover:underline"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
