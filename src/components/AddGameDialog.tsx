import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Game } from '../types'
import type { NewGame } from '../api'
import { searchWikipedia, type WikiResult } from '../covers'
import { Button, Dialog } from './Dialog'
import { Cover } from './Cover'

interface Props {
  open: boolean
  onClose: () => void
  games: Game[]
  pendingCount: number
  platforms: string[]
  /** Devuelve null si salió bien, o el mensaje de error. */
  onSubmit: (game: NewGame) => Promise<string | null>
}

type PositionChoice = 'start' | 'middle' | 'end' | 'other'

interface Draft {
  title: string
  cover: string | null
  description: string | null
}

/**
 * Paso 1: buscar en Wikipedia (autocompletado: nombre y carátula).
 * Paso 2: confirmar plataforma, time to beat y en qué lugar de la cola va.
 */
export function AddGameDialog({ open, onClose, games, pendingCount, platforms, onSubmit }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null)

  useEffect(() => {
    if (!open) setDraft(null)
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} title={draft ? 'Agregar al backlog' : 'Agregar juego'} wide>
      {draft ? (
        <AddForm
          draft={draft}
          games={games}
          pendingCount={pendingCount}
          platforms={platforms}
          onBack={() => setDraft(null)}
          onSubmit={onSubmit}
        />
      ) : (
        <Search onPick={setDraft} />
      )}
    </Dialog>
  )
}

// ───────────────────────── Paso 1: búsqueda ─────────────────────────

function Search({ onPick }: { onPick: (d: Draft) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WikiResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const listId = useId()
  const lastRequest = useRef(0)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      setError(null)
      return
    }
    setSearching(true)
    const id = ++lastRequest.current
    const abort = new AbortController()
    const t = setTimeout(async () => {
      try {
        const r = await searchWikipedia(q, abort.signal)
        if (id !== lastRequest.current) return // llegó tarde: hay una búsqueda más nueva
        setResults(r)
        setActive(0)
        setError(null)
      } catch (e) {
        if (id !== lastRequest.current) return
        setError(e instanceof Error ? e.message : 'No se pudo buscar.')
        setResults([])
      } finally {
        if (id === lastRequest.current) setSearching(false)
      }
    }, 400)
    return () => {
      clearTimeout(t)
      abort.abort()
    }
  }, [query])

  const manual = query.trim()
  const options = results.length + (manual ? 1 : 0)

  function pick(i: number) {
    const r = results[i]
    if (r) {
      onPick({ title: r.name, cover: r.cover, description: r.description })
    } else if (manual) {
      onPick({ title: manual, cover: null, description: null })
    }
  }

  return (
    <div>
      <div className="relative">
        <input
          autoFocus
          type="search"
          role="combobox"
          aria-expanded={options > 0}
          aria-controls={listId}
          aria-activedescendant={options > 0 ? `${listId}-${active}` : undefined}
          placeholder="Buscá un juego… (ej. Hollow Knight)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, options - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter' && options > 0) {
              e.preventDefault()
              pick(active)
            }
          }}
          className="w-full rounded-xl bg-zinc-950 py-3 pr-10 pl-4 text-base ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-violet-400"
        />
        {searching && (
          <span className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        )}
      </div>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      <ul id={listId} role="listbox" className="mt-3 max-h-[min(24rem,55vh)] space-y-1 overflow-y-auto">
        {results.map((r, i) => (
          <li
            key={r.pageId}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onClick={() => pick(i)}
            className={`flex cursor-pointer items-center gap-3 rounded-xl p-2 transition ${i === active ? 'bg-white/10' : ''}`}
          >
            <div className="relative aspect-[3/4] w-10 shrink-0 overflow-hidden rounded-md bg-zinc-800">
              {r.cover && <img src={r.cover} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.name}</p>
              {r.description && <p className="truncate text-xs text-zinc-400">{r.description}</p>}
            </div>
          </li>
        ))}
        {manual && !searching && (
          <li
            id={`${listId}-${results.length}`}
            role="option"
            aria-selected={active === results.length}
            onMouseEnter={() => setActive(results.length)}
            onClick={() => pick(results.length)}
            className={`cursor-pointer rounded-xl p-3 text-sm text-zinc-300 transition ${active === results.length ? 'bg-white/10' : ''}`}
          >
            ＋ Agregar «{manual}» sin autocompletar
          </li>
        )}
      </ul>

      {!manual && <p className="mt-2 text-sm text-zinc-500">Trae el nombre y la carátula desde Wikipedia.</p>}
    </div>
  )
}

// ───────────────────────── Paso 2: confirmar ─────────────────────────

function AddForm({
  draft,
  games,
  pendingCount,
  platforms,
  onBack,
  onSubmit,
}: {
  draft: Draft
  games: Game[]
  pendingCount: number
  platforms: string[]
  onBack: () => void
  onSubmit: (game: NewGame) => Promise<string | null>
}) {
  const total = pendingCount + 1
  const [title, setTitle] = useState(draft.title)
  const [platform, setPlatform] = useState('')
  const [ttb, setTtb] = useState('')
  const [choice, setChoice] = useState<PositionChoice>('end')
  const [custom, setCustom] = useState(String(total))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const datalistId = useId()

  const position = { start: 1, middle: Math.floor(pendingCount / 2) + 1, end: total, other: Number(custom) }[choice]
  const positionValid = Number.isInteger(position) && position >= 1 && position <= total
  const ttbValue = ttb.trim() === '' ? null : Number(ttb.replace(',', '.'))
  const ttbValid = ttbValue === null || (isFinite(ttbValue) && ttbValue >= 0 && ttbValue <= 1000)

  const duplicate = useMemo(
    () =>
      games.some(
        (g) =>
          g.title.trim().toLowerCase() === title.trim().toLowerCase() &&
          (g.platform ?? '').trim().toLowerCase() === platform.trim().toLowerCase(),
      ),
    [games, title, platform],
  )
  const valid = title.trim() !== '' && platform.trim() !== '' && positionValid && ttbValid && !duplicate

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    const err = await onSubmit({ title: title.trim(), platform: platform.trim(), timeToBeat: ttbValue, cover: draft.cover, position })
    if (err) {
      setError(err)
      setSaving(false)
    }
  }

  const chips = platforms.slice(0, 8)

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex gap-4">
        <Cover title={title || draft.title} platform={platform} override={draft.cover} className="relative aspect-[2/3] w-20 shrink-0 rounded-lg ring-1 ring-white/10" />
        <div className="min-w-0 flex-1 space-y-3">
          <Field label="Nombre">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} className={inputCls} />
          </Field>
          <Field label="Time to beat (horas)">
            <input
              inputMode="decimal"
              value={ttb}
              onChange={(e) => setTtb(e.target.value)}
              placeholder="Opcional"
              className={`${inputBase} w-28 ${ttbValid ? '' : 'ring-rose-400'}`}
            />
            <a
              href={`https://howlongtobeat.com/?q=${encodeURIComponent(title.trim())}`}
              target="_blank"
              rel="noreferrer"
              className="ml-3 text-xs text-violet-300 hover:underline"
            >
              Ver en HowLongToBeat ↗
            </a>
          </Field>
        </div>
      </div>

      <Field label="¿En qué consola?">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chips.map((p) => (
            <Chip key={p} active={platform === p} onClick={() => setPlatform(p)}>
              {p}
            </Chip>
          ))}
        </div>
        <input
          list={datalistId}
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          placeholder="Elegí o escribí una plataforma"
          maxLength={40}
          className={inputCls}
        />
        <datalist id={datalistId}>
          {platforms.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        {draft.description && <p className="mt-1.5 text-xs text-zinc-500">Wikipedia: {draft.description}</p>}
      </Field>

      <Field label="¿Dónde va en la cola de pendientes?">
        <div className="grid grid-cols-4 gap-1.5">
          <Chip active={choice === 'start'} onClick={() => setChoice('start')}>
            Principio
          </Chip>
          <Chip active={choice === 'middle'} onClick={() => setChoice('middle')}>
            Medio
          </Chip>
          <Chip active={choice === 'end'} onClick={() => setChoice('end')}>
            Final
          </Chip>
          <Chip active={choice === 'other'} onClick={() => setChoice('other')}>
            Otro
          </Chip>
        </div>
        {choice === 'other' && (
          <label className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
            Posición
            <input
              type="number"
              min={1}
              max={total}
              autoFocus
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className={`${inputBase} w-24 ${positionValid ? '' : 'ring-rose-400'}`}
            />
            de {total}
          </label>
        )}
        <p className="mt-2 text-sm text-zinc-400">
          {positionValid ? `Va a quedar #${position} de ${total} en Pendientes.` : `Elegí un número entre 1 y ${total}.`}
        </p>
      </Field>

      {duplicate && <p className="text-sm text-amber-300">Ya tenés «{title.trim()}» en {platform.trim()}.</p>}
      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="flex justify-between gap-2">
        <Button type="button" onClick={onBack}>
          ← Volver
        </Button>
        <Button type="submit" variant="primary" disabled={!valid || saving}>
          {saving ? 'Agregando…' : '＋ Agregar'}
        </Button>
      </div>
    </form>
  )
}

const inputBase = 'rounded-xl bg-zinc-950 px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-violet-400'
const inputCls = `w-full ${inputBase}`

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm text-zinc-400">{label}</p>
      {children}
    </div>
  )
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'bg-violet-400/15 text-violet-100 ring-2 ring-violet-400'
          : `bg-white/5 ring-1 hover:bg-white/10 text-zinc-300 ring-white/10`
      }`}
    >
      {children}
    </button>
  )
}
