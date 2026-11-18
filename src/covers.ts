import { useEffect, useRef, useState } from 'react'

/**
 * Carátulas automáticas desde Wikipedia (sin API key, sin secretos).
 * Se buscan solo cuando la tarjeta entra en pantalla y se guardan en el
 * navegador para no repetir la búsqueda.
 */

const CACHE_KEY = 'backlog:covers:v1'
const RETRY_MISSING_MS = 7 * 86_400_000 // reintentar "no encontrado" cada 7 días
const GAP_MS = 350 // pausa entre búsquedas

type Entry = { url: string | null; t: number }

const cache: Record<string, Entry> = (() => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, Entry>
  } catch {
    return {}
  }
})()

function save() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* sin storage: se vuelve a buscar la próxima vez */
  }
}

const key = (title: string) => title.trim().toLowerCase()

/** undefined = todavía no se buscó; null = no hay carátula. */
function cached(title: string): string | null | undefined {
  const e = cache[key(title)]
  if (!e) return undefined
  if (e.url === null && Date.now() - e.t > RETRY_MISSING_MS) return undefined
  return e.url
}

// --- cola: de a una búsqueda, con pausa entre requests ---
// Wikipedia limita las búsquedas anónimas (HTTP 429), así que vamos despacio
// y, si nos frena, esperamos y reintentamos. Como todo queda guardado en el
// navegador, esto solo pasa la primera vez.
const inflight = new Map<string, Promise<string | null>>()
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let queue: Promise<unknown> = Promise.resolve()
let pausedUntil = 0

class RateLimited extends Error {}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    for (let attempt = 0; ; attempt++) {
      const wait = pausedUntil - Date.now()
      if (wait > 0) await sleep(wait)
      try {
        return await fn()
      } catch (e) {
        if (!(e instanceof RateLimited) || attempt >= 4) throw e
        pausedUntil = Date.now() + 5_000 * 2 ** attempt // 5s, 10s, 20s, 40s
      } finally {
        await sleep(GAP_MS)
      }
    }
  })
  queue = run.catch(() => {})
  return run
}

function fetchCover(title: string): Promise<string | null> {
  const k = key(title)
  let p = inflight.get(k)
  if (!p) {
    p = enqueue(() => lookup(title))
      .then((url) => {
        cache[k] = { url, t: Date.now() }
        save()
        return url
      })
      .catch(() => null) // error de red: no se guarda, se reintenta luego
      .finally(() => inflight.delete(k))
    inflight.set(k, p)
  }
  return p
}

interface WikiPage {
  title: string
  index: number
  thumbnail?: { source: string }
}

const simplify = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

async function lookup(title: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    generator: 'search',
    gsrsearch: `${title} video game`,
    gsrlimit: '5',
    gsrnamespace: '0',
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: '600',
    pilicense: 'any',
  })
  // Un 429 a veces llega sin cabeceras CORS y el navegador lo ve como error
  // de red: lo tratamos igual (esperar y reintentar).
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`).catch(() => {
    throw new RateLimited()
  })
  if (res.status === 429) throw new RateLimited()
  if (!res.ok) throw new Error(String(res.status))
  const data = (await res.json()) as { query?: { pages?: WikiPage[] } }
  const pages = (data.query?.pages ?? [])
    .filter((p) => p.thumbnail && !/^list of/i.test(p.title))
    .sort((a, b) => a.index - b.index)

  // Preferir el artículo cuyo título coincide exacto; si no, el primer resultado.
  const wanted = simplify(title)
  const hit = pages.find((p) => simplify(p.title) === wanted) ?? pages[0]
  return hit?.thumbnail?.source ?? null
}

/** Carátula de un juego. `override` = URL manual de la columna "Portada". */
export function useCover(title: string, override?: string | null) {
  const ref = useRef<HTMLDivElement>(null)
  const [url, setUrl] = useState<string | null | undefined>(() => override ?? cached(title))

  useEffect(() => {
    if (override) {
      setUrl(override)
      return
    }
    const hit = cached(title)
    setUrl(hit)
    if (hit !== undefined || !ref.current) return

    let cancelled = false
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        io.disconnect()
        void fetchCover(title).then((u) => {
          if (!cancelled) setUrl(u)
        })
      },
      { rootMargin: '400px' },
    )
    io.observe(ref.current)
    return () => {
      cancelled = true
      io.disconnect()
    }
  }, [title, override])

  return { ref, url }
}
