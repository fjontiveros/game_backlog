import { useEffect, useState } from 'react'
import type { Game } from '../types'
import { daysBetween, formatDate, isoDaysAgo } from '../games'
import { Button, Dialog } from './Dialog'
import { Cover } from './Cover'

interface Props {
  game: Game | null
  onClose: () => void
  onConfirm: (game: Game, date: string) => void
}

type Choice = 'today' | 'yesterday' | 'other'

/**
 * "¿Cuándo lo terminaste?" — Hoy viene elegido (un clic para confirmar),
 * Ayer es un atajo, y "Otra fecha" abre un selector limitado entre la
 * fecha de inicio y hoy.
 */
export function CompleteDialog({ game, onClose, onConfirm }: Props) {
  const today = isoDaysAgo(0)
  const yesterday = isoDaysAgo(1)
  const [choice, setChoice] = useState<Choice>('today')
  const [custom, setCustom] = useState(today)

  useEffect(() => {
    if (game) {
      setChoice('today')
      setCustom(today)
    }
  }, [game, today])

  if (!game) return <Dialog open={false} onClose={onClose} title="" children={null} />

  const start = /^\d{4}-\d{2}-\d{2}$/.test(game.startDate ?? '') ? game.startDate! : undefined
  const yesterdayAllowed = !start || yesterday >= start
  const date = choice === 'today' ? today : choice === 'yesterday' ? yesterday : custom
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today && (!start || date >= start)
  const days = valid ? daysBetween(game.startDate, date) : null

  return (
    <Dialog open onClose={onClose} title="¿Lo terminaste? 🎉">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onConfirm(game, date)
        }}
        className="space-y-5"
      >
        <div className="flex items-center gap-3">
          <Cover title={game.title} platform={game.platform} override={game.cover} className="relative aspect-[2/3] w-12 shrink-0 rounded-md" />
          <div className="min-w-0">
            <p className="font-display truncate font-semibold">{game.title}</p>
            {game.startDate && <p className="text-xs text-zinc-400">Empezado el {formatDate(game.startDate)}</p>}
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm text-zinc-400">Fecha de fin</legend>
          <div className="grid grid-cols-3 gap-2">
            <ChoiceChip active={choice === 'today'} onClick={() => setChoice('today')}>
              Hoy
            </ChoiceChip>
            <ChoiceChip active={choice === 'yesterday'} onClick={() => setChoice('yesterday')} disabled={!yesterdayAllowed}>
              Ayer
            </ChoiceChip>
            <ChoiceChip active={choice === 'other'} onClick={() => setChoice('other')}>
              Otra fecha
            </ChoiceChip>
          </div>
          {choice === 'other' && (
            <input
              type="date"
              value={custom}
              min={start}
              max={today}
              onChange={(e) => setCustom(e.target.value)}
              aria-label="Fecha de fin"
              className="mt-3 w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-sm ring-1 ring-white/10 outline-none [color-scheme:dark] focus:ring-2 focus:ring-emerald-400"
            />
          )}
        </fieldset>

        <p className="min-h-5 text-sm text-zinc-400">
          {valid
            ? `${formatDate(date)}${days != null ? ` · lo jugaste en ${days === 1 ? '1 día' : `${days} días`}` : ''}`
            : 'Elegí una fecha entre el inicio y hoy.'}
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="success" disabled={!valid}>
            ✓ Marcar como completado
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function ChoiceChip({ active, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...props}
      className={`rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-40 ${
        active ? 'bg-emerald-400/15 text-emerald-200 ring-2 ring-emerald-400' : 'bg-white/5 text-zinc-300 ring-1 ring-white/10 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}
