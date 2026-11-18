import { SAMPLE_GAMES } from './sampleData';
export const API_URL = import.meta.env.VITE_API_URL;
export const usingSampleData = !API_URL;
const CACHE_KEY = 'backlog:games';
const TOKEN_KEY = 'backlog:token';
// ───────── Lectura ─────────
export async function fetchGames() {
    if (!API_URL)
        return SAMPLE_GAMES;
    const res = await fetch(API_URL, { redirect: 'follow' });
    if (!res.ok)
        throw new Error(`Error ${res.status} al leer la planilla`);
    const data = (await res.json());
    if (!data.ok || !Array.isArray(data.games))
        throw new Error(data.error ?? 'Respuesta inválida');
    saveCache(data.games);
    return data.games;
}
/** Última lectura guardada, para mostrar algo al instante mientras carga. */
export function cachedGames() {
    if (!API_URL)
        return null;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
export function saveCache(games) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(games));
    }
    catch {
        /* sin storage: no pasa nada */
    }
}
// ───────── Token (solo en este navegador) ─────────
export function getToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    }
    catch {
        return null;
    }
}
export function setToken(token) {
    try {
        if (token)
            localStorage.setItem(TOKEN_KEY, token);
        else
            localStorage.removeItem(TOKEN_KEY);
    }
    catch {
        /* sin storage: habrá que ingresarlo de nuevo */
    }
}
export class ApiError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
/**
 * Llama a una acción del Apps Script. El token va en el cuerpo (nunca en la
 * URL) y como text/plain para evitar el preflight de CORS, que Apps Script
 * no soporta.
 */
export async function postAction(action, token, payload = {}) {
    return (await call(action, token, payload)).game ?? null;
}
async function call(action, token, payload) {
    if (!API_URL)
        throw new ApiError('No hay planilla configurada.');
    let res;
    try {
        res = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, token, ...payload }),
        });
    }
    catch {
        throw new ApiError('Sin conexión con la planilla.');
    }
    if (!res.ok)
        throw new ApiError(`Error ${res.status} al guardar.`);
    const data = (await res.json());
    if (!data.ok)
        throw new ApiError(data.error ?? 'No se pudo guardar.', data.code);
    return data;
}
