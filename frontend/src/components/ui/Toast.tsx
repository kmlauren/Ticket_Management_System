import { useEffect, useState } from "react"
import { Check } from "lucide-react"

interface ToastProps {
  message: string
  onClose: () => void
}

export function Toast({ message, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="flex items-center gap-2.5 bg-[#1d1d1f] text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium">
        <Check
          className="h-4 w-4 flex-shrink-0 text-emerald-400"
          strokeWidth={2.5}
        />
        {message}
      </div>
    </div>
  )
}
