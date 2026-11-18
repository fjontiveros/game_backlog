import { useEffect, useMemo, useState } from 'react'
import type { Game } from '../types'
import { parseDate } from '../games'

/**
 * "¿Cuánto backlog me queda?": con las horas por día y los días por semana
 * que elijas, calcula cuántos meses te llevaría terminar los pendientes.
 * La configuración se recuerda en este navegador.
 */

interface Settings {
  hoursPerDay: number
  daysPerWeek: number
  includePlaying: boolean
}

const STORAGE_KEY = 'backlog:simulator'
const DEFAULTS: Settings = { hoursPerDay: 1.5, daysPerWeek: 5, includePlaying: true }
const WEEKS_PER_MONTH = 52 / 12

function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<Settings> | null
    return { ...DEFAULTS, ...saved }
  } catch {
    return DEFAULTS
  }
}

interface Props {
  pending: Game[]
  playing: Game[] // en progreso + en pausa
  completed: Game[]
}

export function BacklogSimulator({ pending, playing, completed }: Props) {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const { hoursPerDay, daysPerWeek, includePlaying } = settings
  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }))

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* sin storage: vuelve a los valores por defecto */
    }
  }, [settings])

  const calc = useMemo(() => {
    const games = includePlaying ? [...pending, ...playing] : pending
    const known = games.filter((g) => g.timeToBeat != null && g.timeToBeat > 0)
    const knownHours = known.reduce((acc, g) => acc + (g.timeToBeat ?? 0), 0)
    // Los que no tienen time to beat cuentan con el promedio del resto.
    const average = known.length ? knownHours / known.length : 0
    const missing = games.length - known.length
    const totalHours = knownHours + missing * average

    const perWeek = hoursPerDay * daysPerWeek
    const weeks = perWeek > 0 ? totalHours / perWeek : Infinity
    const months = weeks / WEEKS_PER_MONTH
    const finish = new Date()
    finish.setDate(finish.getDate() + Math.ceil(weeks * 7))

    return { games: games.length, totalHours: Math.round(totalHours), missing, average: Math.round(average), perWeek, months, finish }
  }, [pending, playing, includePlaying, hoursPerDay, daysPerWeek])

  // Ritmo real: horas (time to beat) de lo que terminaste en los últimos 12 meses.
  const realPace = useMemo(() => {
    const yearAgo = new Date()
    yearAgo.setFullYear(yearAgo.getFullYear() - 1)
    const recent = completed.filter((g) => (parseDate(g.endDate)?.getTime() ?? 0) >= yearAgo.getTime())
    const hours = recent.reduce((acc, g) => acc + (g.timeToBeat ?? 0), 0)
    if (!recent.length || hours === 0) return null
    const perMonth = hours / 12
    return { games: recent.length, perMonth, months: calc.totalHours / perMonth }
  }, [completed, calc.totalHours])

  if (calc.games === 0) return null

  return (
    <section className="mb-12 rounded-3xl bg-zinc-900/80 p-5 ring-1 ring-white/10 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-zinc-200">¿Cuánto backlog me queda?</h2>
        <p className="text-sm text-zinc-500">
          {calc.games} juegos · ≈ {calc.totalHours} h
        </p>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
        {/* Controles */}
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="sim-hours" className="text-sm text-zinc-400">
                Horas por día
              </label>
              <span className="font-display text-lg font-semibold tabular-nums text-white">{formatHours(hoursPerDay)}</span>
            </div>
            <input
              id="sim-hours"
              type="range"
              min={0.5}
              max={8}
              step={0.5}
              value={hoursPerDay}
              onChange={(e) => update({ hoursPerDay: Number(e.target.value) })}
              className="w-full accent-violet-500"
            />
            <div className="mt-1 flex justify-between text-[11px] text-zinc-600">
              <span>30 min</span>
              <span>8 h</span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-zinc-400">Días por semana</p>
            <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Días por semana">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={daysPerWeek === d}
                  onClick={() => update({ daysPerWeek: d })}
                  className={`rounded-xl py-2 text-sm font-semibold tabular-nums transition ${
                    daysPerWeek === d ? 'bg-violet-400/15 text-violet-100 ring-2 ring-violet-400' : 'bg-white/5 text-zinc-300 ring-1 ring-white/10 hover:bg-white/10'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={includePlaying}
              onChange={(e) => update({ includePlaying: e.target.checked })}
              className="size-4 accent-violet-500"
            />
            Contar también los que estoy jugando ({playing.length})
          </label>
        </div>

        {/* Resultado */}
        <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/5">
          <p className="text-sm text-zinc-400">
            Jugando {formatHours(calc.perWeek)} por semana, te quedan
          </p>
          <p className="font-display mt-1 text-4xl font-bold sm:text-5xl tracking-tight text-white tabular-nums" aria-live="polite">
            {formatMonths(calc.months)}
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Terminarías todo hacia <span className="font-medium text-zinc-200">{finishLabel(calc.finish)}</span>.
          </p>

          {realPace && (
            <p className="mt-4 border-t border-white/5 pt-4 text-sm text-zinc-400">
              A tu ritmo real (terminaste {realPace.games} juegos en los últimos 12 meses, ≈ {Math.round(realPace.perMonth)} h por mes) te
              llevaría <span className="font-medium text-zinc-200">{formatMonths(realPace.months)}</span>.
            </p>
          )}

          <p className="mt-4 text-xs text-zinc-500">
            Usa el time to beat de cada juego.
            {calc.missing > 0 && ` ${calc.missing} sin time to beat cuentan como el promedio (≈ ${calc.average} h).`}
            {includePlaying && playing.length > 0 && ' Los que estás jugando cuentan completos.'}
          </p>
        </div>
      </div>
    </section>
  )
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`
  return `${Number.isInteger(h) ? h : h.toFixed(1).replace('.', ',')} h`
}

function formatMonths(months: number): string {
  if (!isFinite(months)) return '∞'
  if (months < 1) {
    const weeks = Math.max(1, Math.round(months * WEEKS_PER_MONTH))
    return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
  }
  if (months < 24) {
    const m = Math.round(months)
    return `${m} ${m === 1 ? 'mes' : 'meses'}`
  }
  const total = Math.round(months)
  const years = Math.floor(total / 12)
  const rest = total % 12
  return `${years} ${years === 1 ? 'año' : 'años'}${rest ? ` y ${rest} ${rest === 1 ? 'mes' : 'meses'}` : ''}`
}

const monthYear = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })
const finishLabel = (d: Date) => monthYear.format(d)
