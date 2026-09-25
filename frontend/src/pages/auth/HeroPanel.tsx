interface HeroPanelProps {
  headline: string
  subtext: string
}

export function HeroPanel({ headline, subtext }: HeroPanelProps) {
  return (
    <div className="relative z-10 hidden flex-[58] flex-col justify-between overflow-hidden p-12 lg:flex">
      <div className="absolute inset-0 bg-slate-950/15" />

      {/* Label */}
      <div className="relative z-10">
        <span className="inline-flex items-center gap-2 text-white/60 text-xs font-semibold uppercase tracking-widest">
          <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          IT Help Desk
        </span>
      </div>

      {/* Main content */}
      <div className="relative z-10">
        <h1 className="text-5xl font-semibold text-white leading-tight tracking-tight mb-4">
          {headline}
        </h1>
        <p className="text-white/70 text-lg leading-relaxed max-w-sm">
          {subtext}
        </p>

      </div>
    </div>
  )
}
