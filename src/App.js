import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, cachedGames, fetchGames, getToken, postAction, saveCache, setToken, usingSampleData } from './api';
import { groupByStatus, isoDaysAgo } from './games';
import { GameCard } from './components/GameCard';
import { NowPlayingCard } from './components/NowPlaying';
import { UnlockDialog } from './components/UnlockDialog';
import { CompleteDialog } from './components/CompleteDialog';
import { Toast } from './components/Toast';
import { AddGameDialog } from './components/AddGameDialog';
import { knownPlatforms } from './platforms';
const SHELVES = [
    { key: 'pending', label: 'Pendientes', empty: 'No hay juegos pendientes. ¡Increíble!', hint: (h) => `≈ ${h} h para terminar todo` },
    { key: 'completed', label: 'Completados', empty: 'Todavía no terminaste ninguno.', hint: (h) => `≈ ${h} h jugadas` },
    { key: 'abandoned', label: 'Abandonados', empty: 'Nada abandonado.', hint: () => '' },
];
const sumHours = (games) => Math.round(games.reduce((acc, g) => acc + (g.timeToBeat ?? 0), 0));
export default function App() {
    const [games, setGames] = useState(() => cachedGames() ?? []);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [shelf, setShelf] = useState('pending');
    const [token, setTokenState] = useState(getToken);
    const [unlockOpen, setUnlockOpen] = useState(false);
    const [completing, setCompleting] = useState(null);
    const [addOpen, setAddOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const canEdit = !usingSampleData && !!token;
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setGames(await fetchGames());
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo cargar la planilla');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void load();
    }, [load]);
    const notify = useCallback((t) => setToast({ ...t, id: Date.now() }), []);
    const dismissToast = useCallback(() => setToast(null), []);
    const saveToken = useCallback((t) => {
        setToken(t);
        setTokenState(t);
    }, []);
    /**
     * Cambio optimista: se ve al instante, se guarda en la planilla y, si
     * falla, vuelve atrás. Devuelve el juego como quedó (o null si falló).
     */
    const mutate = useCallback(async (game, action, patch, date) => {
        if (!token || !game.id)
            return null;
        const sameGame = (g) => g.id === game.id;
        setGames((gs) => gs.map((g) => (sameGame(g) ? { ...g, ...patch } : g)));
        try {
            const updated = (await postAction(action, token, { id: game.id, date })) ?? { ...game, ...patch };
            setGames((gs) => {
                const next = gs.map((g) => (sameGame(g) ? updated : g));
                saveCache(next);
                return next;
            });
            return updated;
        }
        catch (e) {
            setGames((gs) => gs.map((g) => (sameGame(g) ? game : g)));
            if (e instanceof ApiError && e.code === 'unauthorized') {
                saveToken(null);
                notify({ tone: 'error', message: 'El token ya no es válido. Activá la edición de nuevo.' });
            }
            else {
                notify({ tone: 'error', message: e instanceof Error ? e.message : 'No se pudo guardar.' });
            }
            return null;
        }
    }, [token, notify, saveToken]);
    const lockAfterUnauthorized = useCallback(() => {
        saveToken(null);
        setAddOpen(false);
        notify({ tone: 'error', message: 'El token ya no es válido. Activá la edición de nuevo.' });
    }, [saveToken, notify]);
    /** Agrega el juego y recarga la lista (cambian los "Orden" de la cola). */
    const addGame = useCallback(async (newGame) => {
        if (!token)
            return 'Activá la edición primero.';
        try {
            const game = await postAction('add', token, newGame);
            setAddOpen(false);
            setShelf('pending');
            notify({ tone: 'success', message: `Agregaste ${game?.title ?? newGame.title} (#${newGame.position} en Pendientes)` });
            void load();
            return null;
        }
        catch (e) {
            if (e instanceof ApiError && e.code === 'unauthorized')
                lockAfterUnauthorized();
            return e instanceof Error ? e.message : 'No se pudo agregar.';
        }
    }, [token, notify, load, lockAfterUnauthorized]);
    const startGame = useCallback(async (game) => {
        const updated = await mutate(game, 'start', { startDate: isoDaysAgo(0) }, isoDaysAgo(0));
        if (updated)
            notify({
                tone: 'success',
                message: `Empezaste ${game.title} 🎮`,
                action: { label: 'Deshacer', run: () => void mutate(updated, 'unstart', { startDate: null }) },
            });
    }, [mutate, notify]);
    const completeGame = useCallback(async (game, date) => {
        setCompleting(null);
        const updated = await mutate(game, 'complete', { endDate: date }, date);
        if (updated)
            notify({
                tone: 'success',
                message: `¡Completaste ${game.title}! 🎉`,
                action: { label: 'Deshacer', run: () => void mutate(updated, 'uncomplete', { endDate: null }) },
            });
    }, [mutate, notify]);
    const groups = useMemo(() => groupByStatus(games), [games]);
    const platforms = useMemo(() => knownPlatforms(games), [games]);
    const firstLoad = loading && games.length === 0;
    const current = SHELVES.find((s) => s.key === shelf);
    const shelfGames = groups[shelf];
    return (_jsxs("div", { className: "relative min-h-screen overflow-x-clip", children: [_jsx("div", { className: "pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(60%_60%_at_20%_0%,rgba(139,92,246,0.18),transparent),radial-gradient(50%_50%_at_90%_10%,rgba(56,189,248,0.12),transparent)]" }), _jsxs("div", { className: "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12", children: [_jsxs("header", { className: "mb-10 flex flex-wrap items-end justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "font-display text-3xl font-bold tracking-tight sm:text-4xl", children: "Mi backlog" }), _jsxs("div", { className: "mt-3 flex flex-wrap gap-2 text-sm", children: [_jsx(Stat, { value: groups.in_progress.length, label: "jugando", color: "bg-amber-400" }), groups.paused.length > 0 && _jsx(Stat, { value: groups.paused.length, label: "en pausa", color: "bg-violet-400" }), _jsx(Stat, { value: groups.pending.length, label: "pendientes", color: "bg-sky-400" }), _jsx(Stat, { value: groups.completed.length, label: "completados", color: "bg-emerald-400" })] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [canEdit && (_jsx("button", { onClick: () => setAddOpen(true), className: "inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow transition hover:bg-zinc-200", children: "\uFF0B Agregar juego" })), !usingSampleData &&
                                        (canEdit ? (_jsxs("button", { onClick: () => {
                                                saveToken(null);
                                                notify({ message: 'Edición desactivada en este navegador.' });
                                            }, title: "Desactivar edici\u00F3n (borra el token de este navegador)", className: "inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 ring-1 ring-emerald-400/30 transition hover:bg-emerald-400/20", children: [_jsx("span", { className: "size-1.5 rounded-full bg-emerald-400" }), "Edici\u00F3n activa"] })) : (_jsx("button", { onClick: () => setUnlockOpen(true), className: "inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 ring-1 ring-white/10 backdrop-blur transition hover:bg-white/10", children: "\uD83D\uDD12 Editar" }))), _jsxs("button", { onClick: () => void load(), disabled: loading, className: "inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 ring-1 ring-white/10 backdrop-blur transition hover:bg-white/10 disabled:opacity-50", children: [_jsx("span", { className: loading ? 'animate-spin' : '', children: "\u21BB" }), loading ? 'Cargando' : 'Actualizar'] })] })] }), usingSampleData && (_jsxs(Notice, { tone: "info", children: ["Est\u00E1s viendo datos de ejemplo. Configur\u00E1 ", _jsx("code", { className: "font-mono", children: "VITE_API_URL" }), " para leer tu planilla."] })), error && (_jsxs(Notice, { tone: "error", children: [error, ". ", games.length > 0 && 'Mostrando la última versión guardada.'] })), _jsxs("section", { className: "mb-12", children: [_jsx(SectionTitle, { children: "Jugando ahora" }), firstLoad ? (_jsx("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-3", children: _jsx("div", { className: "h-48 animate-pulse rounded-3xl bg-zinc-900" }) })) : groups.in_progress.length === 0 ? (_jsx("p", { className: "rounded-3xl border border-dashed border-white/10 px-6 py-10 text-center text-zinc-400", children: "No est\u00E1s jugando nada. \u00BFArranc\u00E1s alguno de tus pendientes?" })) : (_jsx("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-3", children: groups.in_progress.map((g) => (_jsx(NowPlayingCard, { game: g, onComplete: canEdit && g.id ? () => setCompleting(g) : undefined }, g.id ?? `row-${g.row}`))) })), groups.paused.length > 0 && (_jsxs("div", { className: "mt-6", children: [_jsx("h3", { className: "mb-3 text-sm font-medium text-zinc-400", children: "En pausa" }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", children: groups.paused.map((g) => (_jsx(NowPlayingCard, { game: g, paused: true }, g.id ?? `row-${g.row}`))) })] }))] }), _jsxs("section", { children: [_jsxs("div", { className: "mb-5 flex flex-wrap items-center justify-between gap-3", children: [_jsx("nav", { className: "grid w-full grid-cols-3 gap-1 rounded-full bg-zinc-900/80 p-1 ring-1 ring-white/10 sm:flex sm:w-auto", "aria-label": "Estado", children: SHELVES.map((s) => (_jsxs("button", { onClick: () => setShelf(s.key), "aria-pressed": shelf === s.key, className: `rounded-full px-2 py-1.5 text-[13px] font-medium whitespace-nowrap transition sm:px-4 sm:text-sm ${shelf === s.key ? 'bg-white text-zinc-900 shadow' : 'text-zinc-400 hover:text-white'}`, children: [s.label, _jsx("span", { className: `ml-1.5 tabular-nums ${shelf === s.key ? 'text-zinc-500' : 'text-zinc-600'}`, children: groups[s.key].length })] }, s.key))) }), shelfGames.length > 0 && current.hint(sumHours(shelfGames)) && (_jsx("p", { className: "text-sm text-zinc-500", children: current.hint(sumHours(shelfGames)) }))] }), firstLoad ? (_jsx(Grid, { children: Array.from({ length: 6 }, (_, i) => (_jsx("div", { className: "aspect-[2/3] animate-pulse rounded-2xl bg-zinc-900" }, i))) })) : shelfGames.length === 0 ? (_jsx("p", { className: "rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center text-zinc-400", children: current.empty })) : (_jsx(Grid, { children: shelfGames.map((g, i) => (_jsx(GameCard, { game: g, status: shelf, position: i + 1, onStart: canEdit && shelf === 'pending' && g.id ? () => void startGame(g) : undefined }, g.id ?? `row-${g.row}`))) }))] }), _jsx("footer", { className: "mt-16 text-center text-xs text-zinc-600", children: "Car\u00E1tulas: Wikipedia" })] }), _jsx(UnlockDialog, { open: unlockOpen, onClose: () => setUnlockOpen(false), onUnlocked: (t) => {
                    saveToken(t);
                    setUnlockOpen(false);
                    notify({ tone: 'success', message: 'Edición activada.' });
                } }), _jsx(CompleteDialog, { game: completing, onClose: () => setCompleting(null), onConfirm: (g, d) => void completeGame(g, d) }), token && (_jsx(AddGameDialog, { open: addOpen, onClose: () => setAddOpen(false), games: games, pendingCount: groups.pending.length, platforms: platforms, onSubmit: addGame })), _jsx(Toast, { toast: toast, onDismiss: dismissToast })] }));
}
function Grid({ children }) {
    return _jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6", children: children });
}
function SectionTitle({ children }) {
    return _jsx("h2", { className: "font-display mb-4 text-lg font-semibold text-zinc-200", children: children });
}
function Stat({ value, label, color }) {
    return (_jsxs("span", { className: "inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10", children: [_jsx("span", { className: `size-1.5 rounded-full ${color}` }), _jsx("span", { className: "font-semibold tabular-nums text-white", children: value }), _jsx("span", { className: "text-zinc-400", children: label })] }));
}
function Notice({ tone, children }) {
    const styles = tone === 'error' ? 'bg-rose-500/10 text-rose-200 ring-rose-500/20' : 'bg-sky-500/10 text-sky-200 ring-sky-500/20';
    return _jsx("div", { className: `mb-8 rounded-2xl px-4 py-3 text-sm ring-1 ${styles}`, children: children });
}
