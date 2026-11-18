import type { Game } from './types'
import { SAMPLE_GAMES } from './sampleData'

export const API_URL = import.meta.env.VITE_API_URL as string | undefined
export const usingSampleData = !API_URL

const CACHE_KEY = 'backlog:games'
const TOKEN_KEY = 'backlog:token'

// ───────── Lectura ─────────

export async function fetchGames(): Promise<Game[]> {
  if (!API_URL) return SAMPLE_GAMES

  const res = await fetch(API_URL, { redirect: 'follow' })
  if (!res.ok) throw new Error(`Error ${res.status} al leer la planilla`)
  const data = (await res.json()) as { ok: boolean; games?: Game[]; error?: string }
  if (!data.ok || !Array.isArray(data.games)) throw new Error(data.error ?? 'Respuesta inválida')

  saveCache(data.games)
  return data.games
}

/** Última lectura guardada, para mostrar algo al instante mientras carga. */
export function cachedGames(): Game[] | null {
  if (!API_URL) return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Game[]) : null
  } catch {
    return null
  }
}

export function saveCache(games: Game[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(games))
  } catch {
    /* sin storage: no pasa nada */
  }
}

// ───────── Token (solo en este navegador) ─────────

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* sin storage: habrá que ingresarlo de nuevo */
  }
}

// ───────── Escritura ─────────

export type Action = 'ping' | 'start' | 'complete' | 'unstart' | 'uncomplete' | 'add'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message)
  }
}

interface PostResult {
  ok: boolean
  game?: Game
  error?: string
  code?: string
}

export interface NewGame {
  title: string
  platform: string
  timeToBeat: number | null
  cover: string | null
  /** 1 = primero de la cola de pendientes. */
  position: number
}

/**
 * Llama a una acción del Apps Script. El token va en el cuerpo (nunca en la
 * URL) y como text/plain para evitar el preflight de CORS, que Apps Script
 * no soporta.
 */
export async function postAction(action: Action, token: string, payload: { id?: string; date?: string } | NewGame = {}): Promise<Game | null> {
  return (await call(action, token, payload)).game ?? null
}

async function call(action: Action, token: string, payload: object): Promise<PostResult> {
  if (!API_URL) throw new ApiError('No hay planilla configurada.')

  let res: Response
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token, ...payload }),
    })
  } catch {
    throw new ApiError('Sin conexión con la planilla.')
  }
  if (!res.ok) throw new ApiError(`Error ${res.status} al guardar.`)

  const data = (await res.json()) as PostResult
  if (!data.ok) throw new ApiError(data.error ?? 'No se pudo guardar.', data.code)
  return data
}
