import { useEffect } from 'react'

export interface ToastData {
  id: number
  message: string
  tone?: 'success' | 'error'
  action?: { label: string; run: () => void }
}

/** Aviso abajo al centro; se va solo a los 6 s (8 s si es error). */
export function Toast({ toast, onDismiss }: { toast: ToastData | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDismiss, toast.tone === 'error' ? 8000 : 6000)
    return () => clearTimeout(t)
  }, [toast, onDismiss])

  if (!toast) return null
  const dot = toast.tone === 'error' ? 'bg-rose-400' : 'bg-emerald-400'

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4" role="status" aria-live="polite">
      <div
        key={toast.id}
        className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-zinc-800/95 py-3 pr-3 pl-4 text-sm shadow-2xl ring-1 ring-white/10 backdrop-blur"
      >
        <span className={`size-2 shrink-0 rounded-full ${dot}`} />
        <span className="text-zinc-100">{toast.message}</span>
        {toast.action && (
          <button
            onClick={() => {
              toast.action!.run()
              onDismiss()
            }}
            className="ml-1 shrink-0 rounded-full px-3 py-1 font-semibold text-violet-300 hover:bg-white/10"
          >
            {toast.action.label}
          </button>
        )}
        <button onClick={onDismiss} aria-label="Cerrar" className="shrink-0 rounded-full px-2 py-1 text-zinc-500 hover:text-zinc-200">
          ✕
        </button>
      </div>
    </div>
  )
}
