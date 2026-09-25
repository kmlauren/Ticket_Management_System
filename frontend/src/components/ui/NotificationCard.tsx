import type { MouseEvent } from "react"
import { formatRelative } from "@/lib/tickets"

interface NotificationCardProps { title: string; body: string; createdAt: string; read: boolean; clickable?: boolean; onClick?: (event: MouseEvent<HTMLButtonElement>) => void }
export function NotificationCard({ title, body, createdAt, read, clickable = false, onClick }: NotificationCardProps) {
  const className = `w-full rounded-2xl border border-[#e5e5ea] bg-white p-5 text-left shadow-sm ${clickable ? "transition-shadow hover:shadow-md" : ""} ${!read ? "ring-1 ring-blue-100" : ""}`
  const content = <><p className="text-sm font-semibold text-[#1d1d1f]">{title}</p><p className="mt-1 text-sm text-[#6e6e73]">{body}</p><p className="mt-3 text-xs text-[#aeaeb2]">{formatRelative(createdAt)}</p></>
  return clickable ? <button type="button" onClick={onClick} className={className}>{content}</button> : <div className={className}>{content}</div>
}
