import type { Game } from './types'
import { daysBetween, getStatus, parseDate } from './games'

/** null = todos los años. */
export type YearFilter = number | null

export interface YearStats {
  /** Juegos que estuviste jugando en algún momento del período. */
  played: Game[]
  completed: Game[]
  started: Game[]
  abandoned: Game[]
  /** Suma del time to beat de los completados. */
  hours: number
  /** Promedio de días entre inicio y fin de los completados. */
  avgDays: number | null
  /** Plataformas de los juegos jugados, de la más usada a la menos usada. */
  platforms: { platform: string; played: number; completed: number }[]
}

const yearOf = (value: string | null) => parseDate(value)?.getFullYear() ?? null

/** Años con alguna actividad (inicio o fin), del más reciente al más viejo. */
export function activeYears(games: Game[]): number[] {
  const years = new Set<number>()
  for (const g of games) {
    const s = yearOf(g.startDate)
    const e = yearOf(g.endDate)
    if (s) years.add(s)
    if (e) years.add(e)
  }
  return [...years].sort((a, b) => b - a)
}

/** ¿El juego estuvo "en juego" durante ese año? (entre inicio y fin, o hasta hoy). */
function playedIn(game: Game, year: number): boolean {
  const start = yearOf(game.startDate)
  if (!start || start > year) return false
  const status = getStatus(game)
  if (status === 'completed') return (yearOf(game.endDate) ?? start) >= year
  if (status === 'abandoned') return start === year // sin fecha de fin: cuenta el año en que lo empezaste
  return true // en progreso o en pausa: sigue hasta hoy
}

export function statsFor(games: Game[], year: YearFilter): YearStats {
  const inYear = (value: string | null) => year === null || yearOf(value) === year

  const played = games.filter((g) => (year === null ? !!g.startDate : playedIn(g, year)))
  const completed = games
    .filter((g) => getStatus(g) === 'completed' && parseDate(g.endDate) && inYear(g.endDate))
    .sort((a, b) => (parseDate(b.endDate)?.getTime() ?? 0) - (parseDate(a.endDate)?.getTime() ?? 0))
  const started = games.filter((g) => g.startDate && inYear(g.startDate))
  const abandoned = games.filter((g) => getStatus(g) === 'abandoned' && inYear(g.startDate))

  const durations = completed.map((g) => daysBetween(g.startDate, g.endDate)).filter((d): d is number => d !== null)

  const byPlatform = new Map<string, { played: number; completed: number }>()
  for (const g of played) {
    const p = g.platform?.trim() || 'Sin plataforma'
    const entry = byPlatform.get(p) ?? { played: 0, completed: 0 }
    entry.played++
    if (completed.includes(g)) entry.completed++
    byPlatform.set(p, entry)
  }

  return {
    played,
    completed,
    started,
    abandoned,
    hours: Math.round(completed.reduce((acc, g) => acc + (g.timeToBeat ?? 0), 0)),
    avgDays: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    platforms: [...byPlatform.entries()]
      .map(([platform, v]) => ({ platform, ...v }))
      .sort((a, b) => b.played - a.played || b.completed - a.completed || a.platform.localeCompare(b.platform)),
  }
}

export interface Bucket {
  label: string
  /** Texto largo para el tooltip / lector de pantalla. */
  title: string
  completed: number
  hours: number
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Completados por año (todos los años con actividad, del más viejo al más nuevo). */
export function completedByYear(games: Game[]): Bucket[] {
  const active = activeYears(games)
  if (!active.length) return []
  // Años seguidos, aunque alguno no tenga actividad (para no comprimir el eje).
  const years = Array.from({ length: active[0] - active[active.length - 1] + 1 }, (_, i) => active[active.length - 1] + i)
  return years.map((y) => {
    const done = statsFor(games, y).completed
    return { label: String(y), title: String(y), completed: done.length, hours: sumTtb(done) }
  })
}

/** Completados por mes de un año. */
export function completedByMonth(games: Game[], year: number): Bucket[] {
  const done = statsFor(games, year).completed
  return MONTHS.map((label, m) => {
    const inMonth = done.filter((g) => parseDate(g.endDate)?.getMonth() === m)
    return { label, title: `${MONTHS_LONG[m]} ${year}`, completed: inMonth.length, hours: sumTtb(inMonth) }
  })
}

const sumTtb = (games: Game[]) => Math.round(games.reduce((acc, g) => acc + (g.timeToBeat ?? 0), 0))
