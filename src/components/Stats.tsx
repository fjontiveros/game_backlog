import { useMemo, useState } from 'react'
import type { Game } from '../types'
import { daysBetween, formatDate } from '../games'
import { activeYears, completedByMonth, completedByYear, statsFor, type Bucket, type YearFilter } from '../stats'
import { Cover } from './Cover'

/**
 * Estadísticas por año: cuánto jugaste, cuánto terminaste y en qué consolas.
 * Un solo color de serie (violeta), validado contra el fondo oscuro.
 */
export function StatsView({ games }: { games: Game[] }) {
  const years = useMemo(() => activeYears(games), [games])
  const [year, setYear] = useState<YearFilter>(() => years[0] ?? null)
  const stats = useMemo(() => statsFor(games, year), [games, year])
  const buckets = useMemo(() => (year === null ? completedByYear(games) : completedByMonth(games, year)), [games, year])

  if (years.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center text-zinc-400">
        Todavía no hay fechas de inicio ni de fin para armar estadísticas.
      </p>
    )
  }

  const period = year === null ? 'en total' : `en ${year}`

  return (
    <div className="space-y-6">
      {/* Filtro de año: una sola fila arriba de todo */}
      <nav aria-label="Año" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {[...years, null].map((y) => (
          <button
            key={y ?? 'all'}
            onClick={() => setYear(y)}
            aria-pressed={year === y}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium tabular-nums transition ${
              year === y ? 'bg-white text-zinc-900 shadow' : 'bg-white/5 text-zinc-300 ring-1 ring-white/10 hover:bg-white/10'
            }`}
          >
            {y ?? 'Todos'}
          </button>
        ))}
      </nav>

      {/* Números principales */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile value={stats.played.length} label="Jugados" hint={`empezados o en curso ${period}`} />
        <Tile value={stats.completed.length} label="Completados" hint={period} />
        <Tile value={stats.hours ? `≈ ${stats.hours}` : '—'} unit={stats.hours ? 'h' : undefined} label="Horas" hint="time to beat de los completados" />
        <Tile value={stats.avgDays ?? '—'} unit={stats.avgDays !== null ? 'días' : undefined} label="Por juego" hint="promedio de inicio a fin" />
        <Tile value={stats.abandoned.length} label="Abandonados" hint={period} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title={year === null ? 'Completados por año' : `Completados por mes en ${year}`} className="lg:col-span-3">
          <BarChart data={buckets} />
        </Card>
        <Card title={`Plataformas ${period}`} subtitle="Juegos jugados en cada una" className="lg:col-span-2">
          <PlatformBars rows={stats.platforms} />
        </Card>
      </div>

      <Card title={`Terminados ${period}`} subtitle={stats.completed.length ? `${stats.completed.length} juegos, del más reciente al más viejo` : undefined}>
        {stats.completed.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">Ningún juego terminado {period}.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {stats.completed.map((g) => (
              <CompletedRow key={g.id ?? `row-${g.row}`} game={g} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

// ───────────────────────── Piezas ─────────────────────────

function Tile({ value, unit, label, hint }: { value: number | string; unit?: string; label: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-zinc-900/80 p-4 ring-1 ring-white/10">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="font-display mt-1 text-3xl font-bold tabular-nums text-white">
        {value}
        {unit && <span className="ml-1 text-base font-medium text-zinc-400">{unit}</span>}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  )
}

function Card({ title, subtitle, className = '', children }: { title: string; subtitle?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-3xl bg-zinc-900/80 p-5 ring-1 ring-white/10 ${className}`}>
      <h3 className="font-display text-base font-semibold text-zinc-100">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

const SERIES = '#8b5cf6' // violet-500: pasa las verificaciones de color sobre zinc-900

/** Barras verticales con tooltip al pasar el mouse o al tocar (foco). */
function BarChart({ data }: { data: Bucket[] }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.completed))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]

  return (
    <div>
      <div className="relative flex h-48 gap-2 pl-7">
        {/* grilla y eje: recesivos */}
        {ticks.map((t) => (
          <div key={t} className="pointer-events-none absolute inset-x-0 flex h-0 items-center" style={{ bottom: `${(t / top) * 100}%` }}>
            <span className="w-6 -translate-y-px pr-1 text-right text-[11px] leading-none tabular-nums text-zinc-500">{t}</span>
            <span className={`h-px flex-1 ${t === 0 ? 'bg-white/20' : 'bg-white/5'}`} />
          </div>
        ))}

        {data.map((d, i) => (
          <button
            key={d.label}
            type="button"
            aria-label={`${d.title}: ${d.completed} completados${d.hours ? `, ≈ ${d.hours} horas` : ''}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="group relative flex h-full flex-1 items-end justify-center outline-none"
          >
            {/* zona de hover más grande que la barra */}
            <span
              className={`absolute inset-x-0 inset-y-0 rounded-md transition ${active === i ? 'bg-white/[0.04]' : ''}`}
              aria-hidden
            />
            <span
              className="relative w-full max-w-10 rounded-t-[4px] transition-opacity group-focus-visible:ring-2 group-focus-visible:ring-white"
              style={{
                height: d.completed ? `${(d.completed / top) * 100}%` : 0,
                background: SERIES,
                opacity: active === null || active === i ? 1 : 0.55,
              }}
            />
            {active === i && (
              <span
                className={`pointer-events-none absolute bottom-full z-10 mb-1 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-left text-xs whitespace-nowrap shadow-lg ring-1 ring-white/10 ${
                  i === 0 ? 'left-0' : i === data.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                }`}
              >
                <span className="block font-medium text-zinc-100 capitalize">{d.title}</span>
                <span className="block tabular-nums text-zinc-300">
                  {d.completed} {d.completed === 1 ? 'completado' : 'completados'}
                  {d.hours > 0 && ` · ≈ ${d.hours} h`}
                </span>
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2 pl-7">
        {data.map((d, i) => (
          <span key={d.label} className={`flex-1 text-center text-[11px] tabular-nums ${active === i ? 'text-zinc-200' : 'text-zinc-500'}`}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/** 0, paso, 2·paso… hasta cubrir el máximo, con 3-4 líneas. */
function niceTicks(max: number): number[] {
  const step = max <= 4 ? 1 : max <= 8 ? 2 : max <= 20 ? 5 : Math.ceil(max / 4 / 5) * 5
  const ticks = []
  // Siempre una línea más arriba del máximo: deja aire para el tooltip.
  for (let t = 0; t <= max + step - 1 || t <= max; t += step) ticks.push(t)
  if (ticks[ticks.length - 1] === max) ticks.push(max + step)
  return ticks
}

function PlatformBars({ rows }: { rows: { platform: string; played: number; completed: number }[] }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-zinc-400">Sin juegos en este período.</p>
  const shown = rows.slice(0, 8)
  const rest = rows.slice(8)
  const all = rest.length
    ? [...shown, { platform: `Otras (${rest.length})`, played: rest.reduce((a, r) => a + r.played, 0), completed: rest.reduce((a, r) => a + r.completed, 0) }]
    : shown
  const max = Math.max(...all.map((r) => r.played))

  return (
    <ul className="space-y-2.5">
      {all.map((r) => (
        <li key={r.platform} className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3 text-sm">
          <span className="truncate text-zinc-300" title={r.platform}>
            {r.platform}
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-white/5">
            <span className="block h-full rounded-full" style={{ width: `${(r.played / max) * 100}%`, background: SERIES }} />
          </span>
          <span className="text-right text-xs tabular-nums text-zinc-400">
            <span className="font-semibold text-zinc-100">{r.played}</span>
            {r.completed > 0 && <span> · {r.completed} ✓</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function CompletedRow({ game }: { game: Game }) {
  const days = daysBetween(game.startDate, game.endDate)
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-2 ring-1 ring-white/5">
      <Cover title={game.title} platform={game.platform} override={game.cover} className="relative aspect-[2/3] w-11 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">{game.title}</p>
        <p className="truncate text-xs text-zinc-400">
          {[game.platform, formatDate(game.endDate)].filter(Boolean).join(' · ')}
        </p>
        <p className="text-xs text-zinc-500">
          {[days !== null && `${days} ${days === 1 ? 'día' : 'días'}`, game.timeToBeat && `≈ ${game.timeToBeat} h`].filter(Boolean).join(' · ')}
        </p>
      </div>
    </li>
  )
}
