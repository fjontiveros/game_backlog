import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Game, Status } from './types'
import { ApiError, cachedGames, fetchGames, getToken, postAction, saveCache, setToken, usingSampleData, type Action } from './api'
import { groupByStatus, isoDaysAgo } from './games'
import { GameCard } from './components/GameCard'
import { NowPlayingCard } from './components/NowPlaying'
import { UnlockDialog } from './components/UnlockDialog'
import { CompleteDialog } from './components/CompleteDialog'
import { Toast, type ToastData } from './components/Toast'

type Shelf = Exclude<Status, 'in_progress'>

const SHELVES: { key: Shelf; label: string; empty: string; hint: (hours: number) => string }[] = [
  { key: 'pending', label: 'Pendientes', empty: 'No hay juegos pendientes. ¡Increíble!', hint: (h) => `≈ ${h} h para terminar todo` },
  { key: 'completed', label: 'Completados', empty: 'Todavía no terminaste ninguno.', hint: (h) => `≈ ${h} h jugadas` },
  { key: 'abandoned', label: 'Abandonados', empty: 'Nada abandonado.', hint: () => '' },
]

const sumHours = (games: Game[]) => Math.round(games.reduce((acc, g) => acc + (g.timeToBeat ?? 0), 0))

export default function App() {
  const [games, setGames] = useState<Game[]>(() => cachedGames() ?? [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shelf, setShelf] = useState<Shelf>('pending')
  const [token, setTokenState] = useState<string | null>(getToken)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [completing, setCompleting] = useState<Game | null>(null)
  const [toast, setToast] = useState<ToastData | null>(null)
  const canEdit = !usingSampleData && !!token

  const notify = useCallback((t: Omit<ToastData, 'id'>) => setToast({ ...t, id: Date.now() }), [])
  const dismissToast = useCallback(() => setToast(null), [])

  const saveToken = useCallback((t: string | null) => {
    setToken(t)
    setTokenState(t)
  }, [])

  /**
   * Cambio optimista: se ve al instante, se guarda en la planilla y, si
   * falla, vuelve atrás. Devuelve el juego como quedó (o null si falló).
   */
  const mutate = useCallback(
    async (game: Game, action: Action, patch: Partial<Game>, date?: string): Promise<Game | null> => {
      if (!token || !game.id) return null
      const sameGame = (g: Game) => g.id === game.id
      setGames((gs) => gs.map((g) => (sameGame(g) ? { ...g, ...patch } : g)))
      try {
        const updated = (await postAction(action, token, { id: game.id, date })) ?? { ...game, ...patch }
        setGames((gs) => {
          const next = gs.map((g) => (sameGame(g) ? updated : g))
          saveCache(next)
          return next
        })
        return updated
      } catch (e) {
        setGames((gs) => gs.map((g) => (sameGame(g) ? game : g)))
        if (e instanceof ApiError && e.code === 'unauthorized') {
          saveToken(null)
          notify({ tone: 'error', message: 'El token ya no es válido. Activá la edición de nuevo.' })
        } else {
          notify({ tone: 'error', message: e instanceof Error ? e.message : 'No se pudo guardar.' })
        }
        return null
      }
    },
    [token, notify, saveToken],
  )

  const startGame = useCallback(
    async (game: Game) => {
      const updated = await mutate(game, 'start', { startDate: isoDaysAgo(0) }, isoDaysAgo(0))
      if (updated)
        notify({
          tone: 'success',
          message: `Empezaste ${game.title} 🎮`,
          action: { label: 'Deshacer', run: () => void mutate(updated, 'unstart', { startDate: null }) },
        })
    },
    [mutate, notify],
  )

  const completeGame = useCallback(
    async (game: Game, date: string) => {
      setCompleting(null)
      const updated = await mutate(game, 'complete', { endDate: date }, date)
      if (updated)
        notify({
          tone: 'success',
          message: `¡Completaste ${game.title}! 🎉`,
          action: { label: 'Deshacer', run: () => void mutate(updated, 'uncomplete', { endDate: null }) },
        })
    },
    [mutate, notify],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setGames(await fetchGames())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la planilla')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const groups = useMemo(() => groupByStatus(games), [games])
  const firstLoad = loading && games.length === 0
  const current = SHELVES.find((s) => s.key === shelf)!
  const shelfGames = groups[shelf]

  return (
    <div className="relative min-h-screen overflow-x-clip">
      {/* brillo de fondo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(60%_60%_at_20%_0%,rgba(139,92,246,0.18),transparent),radial-gradient(50%_50%_at_90%_10%,rgba(56,189,248,0.12),transparent)]" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Mi backlog</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <Stat value={groups.in_progress.length} label="jugando" color="bg-amber-400" />
              {groups.paused.length > 0 && <Stat value={groups.paused.length} label="en pausa" color="bg-violet-400" />}
              <Stat value={groups.pending.length} label="pendientes" color="bg-sky-400" />
              <Stat value={groups.completed.length} label="completados" color="bg-emerald-400" />
            </div>
          </div>
          <div className="flex gap-2">
            {!usingSampleData &&
              (canEdit ? (
                <button
                  onClick={() => {
                    saveToken(null)
                    notify({ message: 'Edición desactivada en este navegador.' })
                  }}
                  title="Desactivar edición (borra el token de este navegador)"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 ring-1 ring-emerald-400/30 transition hover:bg-emerald-400/20"
                >
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Edición activa
                </button>
              ) : (
                <button
                  onClick={() => setUnlockOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 ring-1 ring-white/10 backdrop-blur transition hover:bg-white/10"
                >
                  🔒 Editar
                </button>
              ))}
            <button
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 ring-1 ring-white/10 backdrop-blur transition hover:bg-white/10 disabled:opacity-50"
            >
              <span className={loading ? 'animate-spin' : ''}>↻</span>
              {loading ? 'Cargando' : 'Actualizar'}
            </button>
          </div>
        </header>

        {usingSampleData && (
          <Notice tone="info">
            Estás viendo datos de ejemplo. Configurá <code className="font-mono">VITE_API_URL</code> para leer tu planilla.
          </Notice>
        )}
        {error && (
          <Notice tone="error">
            {error}. {games.length > 0 && 'Mostrando la última versión guardada.'}
          </Notice>
        )}

        {/* Jugando ahora */}
        <section className="mb-12">
          <SectionTitle>Jugando ahora</SectionTitle>
          {firstLoad ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="h-48 animate-pulse rounded-3xl bg-zinc-900" />
            </div>
          ) : groups.in_progress.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-white/10 px-6 py-10 text-center text-zinc-400">
              No estás jugando nada. ¿Arrancás alguno de tus pendientes?
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groups.in_progress.map((g) => (
                <NowPlayingCard key={g.id ?? `row-${g.row}`} game={g} onComplete={canEdit && g.id ? () => setCompleting(g) : undefined} />
              ))}
            </div>
          )}

          {groups.paused.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium text-zinc-400">En pausa</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groups.paused.map((g) => (
                  <NowPlayingCard key={g.id ?? `row-${g.row}`} game={g} paused />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Estantes: pendientes / completados / abandonados */}
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <nav className="grid w-full grid-cols-3 gap-1 rounded-full bg-zinc-900/80 p-1 ring-1 ring-white/10 sm:flex sm:w-auto" aria-label="Estado">
              {SHELVES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setShelf(s.key)}
                  aria-pressed={shelf === s.key}
                  className={`rounded-full px-2 py-1.5 text-[13px] font-medium whitespace-nowrap transition sm:px-4 sm:text-sm ${
                    shelf === s.key ? 'bg-white text-zinc-900 shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {s.label}
                  <span className={`ml-1.5 tabular-nums ${shelf === s.key ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    {groups[s.key].length}
                  </span>
                </button>
              ))}
            </nav>
            {shelfGames.length > 0 && current.hint(sumHours(shelfGames)) && (
              <p className="text-sm text-zinc-500">{current.hint(sumHours(shelfGames))}</p>
            )}
          </div>

          {firstLoad ? (
            <Grid>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="aspect-[2/3] animate-pulse rounded-2xl bg-zinc-900" />
              ))}
            </Grid>
          ) : shelfGames.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center text-zinc-400">{current.empty}</p>
          ) : (
            <Grid>
              {shelfGames.map((g, i) => (
                <GameCard
                  key={g.id ?? `row-${g.row}`}
                  game={g}
                  status={shelf}
                  position={i + 1}
                  onStart={canEdit && shelf === 'pending' && g.id ? () => void startGame(g) : undefined}
                />
              ))}
            </Grid>
          )}
        </section>

        <footer className="mt-16 text-center text-xs text-zinc-600">Carátulas: Wikipedia</footer>
      </div>

      <UnlockDialog
        open={unlockOpen}
        onClose={() => setUnlockOpen(false)}
        onUnlocked={(t) => {
          saveToken(t)
          setUnlockOpen(false)
          notify({ tone: 'success', message: 'Edición activada.' })
        }}
      />
      <CompleteDialog game={completing} onClose={() => setCompleting(null)} onConfirm={(g, d) => void completeGame(g, d)} />
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{children}</div>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display mb-4 text-lg font-semibold text-zinc-200">{children}</h2>
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
      <span className={`size-1.5 rounded-full ${color}`} />
      <span className="font-semibold tabular-nums text-white">{value}</span>
      <span className="text-zinc-400">{label}</span>
    </span>
  )
}

function Notice({ tone, children }: { tone: 'info' | 'error'; children: React.ReactNode }) {
  const styles = tone === 'error' ? 'bg-rose-500/10 text-rose-200 ring-rose-500/20' : 'bg-sky-500/10 text-sky-200 ring-sky-500/20'
  return <div className={`mb-8 rounded-2xl px-4 py-3 text-sm ring-1 ${styles}`}>{children}</div>
}
