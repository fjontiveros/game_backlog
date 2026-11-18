import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { daysBetween, formatDate, platformHue } from '../games';
import { Cover } from './Cover';
/** Tarjeta vertical tipo "biblioteca": carátula 2:3 con la info encima. */
export function GameCard({ game, status, position, onStart }) {
    const abandoned = status === 'abandoned';
    return (_jsxs("article", { className: "group relative aspect-[2/3] overflow-hidden rounded-2xl bg-zinc-900 shadow-lg shadow-black/40 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/60 hover:ring-white/25", children: [_jsx(Cover, { title: game.title, platform: game.platform, override: game.cover, className: "absolute inset-0", imgClassName: `transition duration-500 group-hover:scale-105 ${abandoned ? 'grayscale' : ''}` }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black via-black/50 via-30% to-transparent to-60%" }), _jsxs("div", { className: "absolute inset-x-0 top-0 flex items-start gap-1.5 p-2.5", children: [status === 'pending' && _jsxs(Chip, { children: ["#", position] }), status === 'completed' && _jsx(Chip, { className: "bg-emerald-400/90 text-emerald-950", children: "\u2713" }), abandoned && _jsx(Chip, { className: "bg-rose-400/90 text-rose-950", children: "Abandonado" }), game.timeToBeat != null && _jsxs(Chip, { className: "ml-auto bg-black/60 text-white", children: [game.timeToBeat, " h"] })] }), _jsxs("div", { className: "absolute inset-x-0 bottom-0 p-3", children: [_jsx("h3", { className: "font-display line-clamp-2 text-[15px] leading-tight font-semibold text-white drop-shadow", children: game.title }), _jsxs("div", { className: "mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-zinc-300", children: [game.platform && _jsx(PlatformDot, { platform: game.platform }), _jsx(Footer, { game: game, status: status })] }), onStart && (_jsx("button", { onClick: onStart, className: "mt-2.5 w-full rounded-full bg-white/90 py-1.5 text-xs font-bold text-zinc-900 opacity-0 shadow-lg transition group-hover:opacity-100 hover:bg-white focus-visible:opacity-100 pointer-coarse:opacity-100", children: "\u25B6 Empezar" }))] })] }));
}
export function Chip({ children, className = 'bg-black/60 text-white' }) {
    return (_jsx("span", { className: `rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums backdrop-blur-md ${className}`, children: children }));
}
export function PlatformDot({ platform }) {
    return (_jsxs("span", { className: "inline-flex shrink-0 items-center gap-1.5 font-medium", children: [_jsx("span", { className: "size-1.5 rounded-full", style: { backgroundColor: `hsl(${platformHue(platform)} 85% 65%)` } }), platform] }));
}
function Footer({ game, status }) {
    let text = null;
    if (status === 'completed') {
        const days = daysBetween(game.startDate, game.endDate);
        text = days != null ? `${days === 1 ? '1 día' : `${days} días`}` : formatDate(game.endDate);
    }
    else if (status === 'abandoned') {
        text = formatDate(game.startDate);
    }
    return text ? _jsxs("span", { className: "truncate text-zinc-400", children: ["\u00B7 ", text] }) : null;
}
