import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { searchWikipedia } from '../covers';
import { Button, Dialog } from './Dialog';
import { Cover } from './Cover';
/**
 * Paso 1: buscar en Wikipedia (autocompletado: nombre y carátula).
 * Paso 2: confirmar plataforma, time to beat y en qué lugar de la cola va.
 */
export function AddGameDialog({ open, onClose, games, pendingCount, platforms, onSubmit }) {
    const [draft, setDraft] = useState(null);
    useEffect(() => {
        if (!open)
            setDraft(null);
    }, [open]);
    return (_jsx(Dialog, { open: open, onClose: onClose, title: draft ? 'Agregar al backlog' : 'Agregar juego', wide: true, children: draft ? (_jsx(AddForm, { draft: draft, games: games, pendingCount: pendingCount, platforms: platforms, onBack: () => setDraft(null), onSubmit: onSubmit })) : (_jsx(Search, { onPick: setDraft })) }));
}
// ───────────────────────── Paso 1: búsqueda ─────────────────────────
function Search({ onPick }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState(null);
    const [active, setActive] = useState(0);
    const listId = useId();
    const lastRequest = useRef(0);
    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            setSearching(false);
            setError(null);
            return;
        }
        setSearching(true);
        const id = ++lastRequest.current;
        const abort = new AbortController();
        const t = setTimeout(async () => {
            try {
                const r = await searchWikipedia(q, abort.signal);
                if (id !== lastRequest.current)
                    return; // llegó tarde: hay una búsqueda más nueva
                setResults(r);
                setActive(0);
                setError(null);
            }
            catch (e) {
                if (id !== lastRequest.current)
                    return;
                setError(e instanceof Error ? e.message : 'No se pudo buscar.');
                setResults([]);
            }
            finally {
                if (id === lastRequest.current)
                    setSearching(false);
            }
        }, 400);
        return () => {
            clearTimeout(t);
            abort.abort();
        };
    }, [query]);
    const manual = query.trim();
    const options = results.length + (manual ? 1 : 0);
    function pick(i) {
        const r = results[i];
        if (r) {
            onPick({ title: r.name, cover: r.cover, description: r.description });
        }
        else if (manual) {
            onPick({ title: manual, cover: null, description: null });
        }
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "relative", children: [_jsx("input", { autoFocus: true, type: "search", role: "combobox", "aria-expanded": options > 0, "aria-controls": listId, "aria-activedescendant": options > 0 ? `${listId}-${active}` : undefined, placeholder: "Busc\u00E1 un juego\u2026 (ej. Hollow Knight)", value: query, onChange: (e) => setQuery(e.target.value), onKeyDown: (e) => {
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setActive((a) => Math.min(a + 1, options - 1));
                            }
                            else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setActive((a) => Math.max(a - 1, 0));
                            }
                            else if (e.key === 'Enter' && options > 0) {
                                e.preventDefault();
                                pick(active);
                            }
                        }, className: "w-full rounded-xl bg-zinc-950 py-3 pr-10 pl-4 text-base ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-violet-400" }), searching && (_jsx("span", { className: "absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-white/20 border-t-white/80" }))] }), error && _jsx("p", { className: "mt-3 text-sm text-rose-300", children: error }), _jsxs("ul", { id: listId, role: "listbox", className: "mt-3 max-h-[min(24rem,55vh)] space-y-1 overflow-y-auto", children: [results.map((r, i) => (_jsxs("li", { id: `${listId}-${i}`, role: "option", "aria-selected": i === active, onMouseEnter: () => setActive(i), onClick: () => pick(i), className: `flex cursor-pointer items-center gap-3 rounded-xl p-2 transition ${i === active ? 'bg-white/10' : ''}`, children: [_jsx("div", { className: "relative aspect-[3/4] w-10 shrink-0 overflow-hidden rounded-md bg-zinc-800", children: r.cover && _jsx("img", { src: r.cover, alt: "", referrerPolicy: "no-referrer", className: "size-full object-cover" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate font-medium", children: r.name }), r.description && _jsx("p", { className: "truncate text-xs text-zinc-400", children: r.description })] })] }, r.pageId))), manual && !searching && (_jsxs("li", { id: `${listId}-${results.length}`, role: "option", "aria-selected": active === results.length, onMouseEnter: () => setActive(results.length), onClick: () => pick(results.length), className: `cursor-pointer rounded-xl p-3 text-sm text-zinc-300 transition ${active === results.length ? 'bg-white/10' : ''}`, children: ["\uFF0B Agregar \u00AB", manual, "\u00BB sin autocompletar"] }))] }), !manual && _jsx("p", { className: "mt-2 text-sm text-zinc-500", children: "Trae el nombre y la car\u00E1tula desde Wikipedia." })] }));
}
// ───────────────────────── Paso 2: confirmar ─────────────────────────
function AddForm({ draft, games, pendingCount, platforms, onBack, onSubmit, }) {
    const total = pendingCount + 1;
    const [title, setTitle] = useState(draft.title);
    const [platform, setPlatform] = useState('');
    const [ttb, setTtb] = useState('');
    const [choice, setChoice] = useState('end');
    const [custom, setCustom] = useState(String(total));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const datalistId = useId();
    const position = { start: 1, middle: Math.floor(pendingCount / 2) + 1, end: total, other: Number(custom) }[choice];
    const positionValid = Number.isInteger(position) && position >= 1 && position <= total;
    const ttbValue = ttb.trim() === '' ? null : Number(ttb.replace(',', '.'));
    const ttbValid = ttbValue === null || (isFinite(ttbValue) && ttbValue >= 0 && ttbValue <= 1000);
    const duplicate = useMemo(() => games.some((g) => g.title.trim().toLowerCase() === title.trim().toLowerCase() &&
        (g.platform ?? '').trim().toLowerCase() === platform.trim().toLowerCase()), [games, title, platform]);
    const valid = title.trim() !== '' && platform.trim() !== '' && positionValid && ttbValid && !duplicate;
    async function submit(e) {
        e.preventDefault();
        if (!valid || saving)
            return;
        setSaving(true);
        setError(null);
        const err = await onSubmit({ title: title.trim(), platform: platform.trim(), timeToBeat: ttbValue, cover: draft.cover, position });
        if (err) {
            setError(err);
            setSaving(false);
        }
    }
    const chips = platforms.slice(0, 8);
    return (_jsxs("form", { onSubmit: submit, className: "space-y-5", children: [_jsxs("div", { className: "flex gap-4", children: [_jsx(Cover, { title: title || draft.title, platform: platform, override: draft.cover, className: "relative aspect-[2/3] w-20 shrink-0 rounded-lg ring-1 ring-white/10" }), _jsxs("div", { className: "min-w-0 flex-1 space-y-3", children: [_jsx(Field, { label: "Nombre", children: _jsx("input", { value: title, onChange: (e) => setTitle(e.target.value), maxLength: 150, className: inputCls }) }), _jsxs(Field, { label: "Time to beat (horas)", children: [_jsx("input", { inputMode: "decimal", value: ttb, onChange: (e) => setTtb(e.target.value), placeholder: "Opcional", className: `${inputBase} w-28 ${ttbValid ? '' : 'ring-rose-400'}` }), _jsx("a", { href: `https://howlongtobeat.com/?q=${encodeURIComponent(title.trim())}`, target: "_blank", rel: "noreferrer", className: "ml-3 text-xs text-violet-300 hover:underline", children: "Ver en HowLongToBeat \u2197" })] })] })] }), _jsxs(Field, { label: "\u00BFEn qu\u00E9 consola?", children: [_jsx("div", { className: "mb-2 flex flex-wrap gap-1.5", children: chips.map((p) => (_jsx(Chip, { active: platform === p, onClick: () => setPlatform(p), children: p }, p))) }), _jsx("input", { list: datalistId, value: platform, onChange: (e) => setPlatform(e.target.value), placeholder: "Eleg\u00ED o escrib\u00ED una plataforma", maxLength: 40, className: inputCls }), _jsx("datalist", { id: datalistId, children: platforms.map((p) => (_jsx("option", { value: p }, p))) }), draft.description && _jsxs("p", { className: "mt-1.5 text-xs text-zinc-500", children: ["Wikipedia: ", draft.description] })] }), _jsxs(Field, { label: "\u00BFD\u00F3nde va en la cola de pendientes?", children: [_jsxs("div", { className: "grid grid-cols-4 gap-1.5", children: [_jsx(Chip, { active: choice === 'start', onClick: () => setChoice('start'), children: "Principio" }), _jsx(Chip, { active: choice === 'middle', onClick: () => setChoice('middle'), children: "Medio" }), _jsx(Chip, { active: choice === 'end', onClick: () => setChoice('end'), children: "Final" }), _jsx(Chip, { active: choice === 'other', onClick: () => setChoice('other'), children: "Otro" })] }), choice === 'other' && (_jsxs("label", { className: "mt-2 flex items-center gap-2 text-sm text-zinc-400", children: ["Posici\u00F3n", _jsx("input", { type: "number", min: 1, max: total, autoFocus: true, value: custom, onChange: (e) => setCustom(e.target.value), className: `${inputBase} w-24 ${positionValid ? '' : 'ring-rose-400'}` }), "de ", total] })), _jsx("p", { className: "mt-2 text-sm text-zinc-400", children: positionValid ? `Va a quedar #${position} de ${total} en Pendientes.` : `Elegí un número entre 1 y ${total}.` })] }), duplicate && _jsxs("p", { className: "text-sm text-amber-300", children: ["Ya ten\u00E9s \u00AB", title.trim(), "\u00BB en ", platform.trim(), "."] }), error && _jsx("p", { className: "text-sm text-rose-300", children: error }), _jsxs("div", { className: "flex justify-between gap-2", children: [_jsx(Button, { type: "button", onClick: onBack, children: "\u2190 Volver" }), _jsx(Button, { type: "submit", variant: "primary", disabled: !valid || saving, children: saving ? 'Agregando…' : '＋ Agregar' })] })] }));
}
const inputBase = 'rounded-xl bg-zinc-950 px-3 py-2 text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-violet-400';
const inputCls = `w-full ${inputBase}`;
function Field({ label, children }) {
    return (_jsxs("div", { children: [_jsx("p", { className: "mb-1.5 text-sm text-zinc-400", children: label }), children] }));
}
function Chip({ active, children, onClick, }) {
    return (_jsx("button", { type: "button", "aria-pressed": active, onClick: onClick, className: `rounded-xl px-3 py-1.5 text-sm font-medium transition ${active
            ? 'bg-violet-400/15 text-violet-100 ring-2 ring-violet-400'
            : `bg-white/5 ring-1 hover:bg-white/10 text-zinc-300 ring-white/10`}`, children: children }));
}
