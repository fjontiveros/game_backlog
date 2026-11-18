import { useState } from 'react'
import { ApiError, postAction } from '../api'
import { Button, Dialog } from './Dialog'

interface Props {
  open: boolean
  onClose: () => void
  onUnlocked: (token: string) => void
}

/** Pide el token una vez y lo valida contra el Apps Script ("ping"). */
export function UnlockDialog({ open, onClose, onUnlocked }: Props) {
  const [value, setValue] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const token = value.trim()
    if (!token) return
    setChecking(true)
    setError(null)
    try {
      await postAction('ping', token)
      setValue('')
      onUnlocked(token)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo verificar el token.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Activar edición">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-zinc-400">
          Pegá tu token para poder modificar la planilla desde acá. Se guarda <strong className="text-zinc-200">solo en este navegador</strong>.
        </p>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Token"
          aria-label="Token"
          className="w-full rounded-xl bg-zinc-950 px-4 py-3 font-mono text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-violet-400"
        />
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={!value.trim() || checking}>
            {checking ? 'Verificando…' : 'Activar'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
