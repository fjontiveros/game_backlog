import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { daysBetween, formatDate, isoDaysAgo } from '../games';
import { Button, Dialog } from './Dialog';
import { Cover } from './Cover';
/**
 * "¿Cuándo lo terminaste?" — Hoy viene elegido (un clic para confirmar),
 * Ayer es un atajo, y "Otra fecha" abre un selector limitado entre la
 * fecha de inicio y hoy.
 */
export function CompleteDialog({ game, onClose, onConfirm }) {
    const today = isoDaysAgo(0);
    const yesterday = isoDaysAgo(1);
    const [choice, setChoice] = useState('today');
    const [custom, setCustom] = useState(today);
    useEffect(() => {
        if (game) {
            setChoice('today');
            setCustom(today);
        }
    }, [game, today]);
    if (!game)
        return _jsx(Dialog, { open: false, onClose: onClose, title: "", children: null });
    const start = /^\d{4}-\d{2}-\d{2}$/.test(game.startDate ?? '') ? game.startDate : undefined;
    const yesterdayAllowed = !start || yesterday >= start;
    const date = choice === 'today' ? today : choice === 'yesterday' ? yesterday : custom;
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today && (!start || date >= start);
    const days = valid ? daysBetween(game.startDate, date) : null;
    return (_jsx(Dialog, { open: true, onClose: onClose, title: "\u00BFLo terminaste? \uD83C\uDF89", children: _jsxs("form", { onSubmit: (e) => {
                e.preventDefault();
                if (valid)
                    onConfirm(game, date);
            }, className: "space-y-5", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Cover, { title: game.title, platform: game.platform, override: game.cover, className: "relative aspect-[2/3] w-12 shrink-0 rounded-md" }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "font-display truncate font-semibold", children: game.title }), game.startDate && _jsxs("p", { className: "text-xs text-zinc-400", children: ["Empezado el ", formatDate(game.startDate)] })] })] }), _jsxs("fieldset", { children: [_jsx("legend", { className: "mb-2 text-sm text-zinc-400", children: "Fecha de fin" }), _jsxs("div", { className: "grid grid-cols-3 gap-2", children: [_jsx(ChoiceChip, { active: choice === 'today', onClick: () => setChoice('today'), children: "Hoy" }), _jsx(ChoiceChip, { active: choice === 'yesterday', onClick: () => setChoice('yesterday'), disabled: !yesterdayAllowed, children: "Ayer" }), _jsx(ChoiceChip, { active: choice === 'other', onClick: () => setChoice('other'), children: "Otra fecha" })] }), choice === 'other' && (_jsx("input", { type: "date", value: custom, min: start, max: today, onChange: (e) => setCustom(e.target.value), "aria-label": "Fecha de fin", className: "mt-3 w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-sm ring-1 ring-white/10 outline-none [color-scheme:dark] focus:ring-2 focus:ring-emerald-400" }))] }), _jsx("p", { className: "min-h-5 text-sm text-zinc-400", children: valid
                        ? `${formatDate(date)}${days != null ? ` · lo jugaste en ${days === 1 ? '1 día' : `${days} días`}` : ''}`
                        : 'Elegí una fecha entre el inicio y hoy.' }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { type: "button", onClick: onClose, children: "Cancelar" }), _jsx(Button, { type: "submit", variant: "success", disabled: !valid, children: "\u2713 Marcar como completado" })] })] }) }));
}
function ChoiceChip({ active, children, ...props }) {
    return (_jsx("button", { type: "button", "aria-pressed": active, ...props, className: `rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-40 ${active ? 'bg-emerald-400/15 text-emerald-200 ring-2 ring-emerald-400' : 'bg-white/5 text-zinc-300 ring-1 ring-white/10 hover:bg-white/10'}`, children: children }));
}
