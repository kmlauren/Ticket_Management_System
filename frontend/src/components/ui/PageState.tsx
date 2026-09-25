export function PageLoading() { return <div className="p-8 text-sm text-[#6e6e73]">Loading…</div> }
export function PageError({ message }: { message: string }) { return <div className="m-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{message}</div> }
export function EmptyState({ message }: { message: string }) { return <div className="rounded-2xl border border-[#e5e5ea] bg-white p-12 text-center text-sm text-[#aeaeb2]">{message}</div> }
