/**
 * El estado sale de las fechas: no hay columna "Estado" en la planilla.
 * Fecha Fin = "Abandonado" / "Pausado" son estados especiales.
 */
export function getStatus(game) {
    const end = game.endDate?.trim().toLowerCase() ?? '';
    if (end.startsWith('abandon'))
        return 'abandoned';
    if (end.startsWith('paus'))
        return 'paused';
    if (end)
        return 'completed';
    if (game.startDate)
        return 'in_progress';
    return 'pending';
}
/** Acepta "yyyy-MM-dd" (lo que manda el script) o "dd/mm/aaaa" (texto). */
export function parseDate(value) {
    if (!value)
        return null;
    let m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m)
        return new Date(+m[1], +m[2] - 1, +m[3]);
    m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m)
        return new Date(+m[3], +m[2] - 1, +m[1]);
    return null;
}
const dateFormat = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
export function formatDate(value) {
    const d = parseDate(value);
    return d ? dateFormat.format(d) : value;
}
export function daysBetween(from, to = new Date()) {
    const a = parseDate(from);
    const b = typeof to === 'string' || to === null ? parseDate(to) : to;
    if (!a || !b)
        return null;
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}
/** Fecha local como "yyyy-MM-dd" (sin pasar por UTC). */
export function toISODate(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** Hoy (offset 0), ayer (-1), etc. */
export function isoDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return toISODate(d);
}
const time = (v) => parseDate(v)?.getTime() ?? 0;
/** Pendientes: por "Orden" (o fila). El resto: lo más reciente primero. */
export function sortGames(games, status) {
    const list = [...games];
    switch (status) {
        case 'pending':
            return list.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.row - b.row);
        case 'in_progress':
        case 'paused':
            return list.sort((a, b) => time(b.startDate) - time(a.startDate));
        case 'completed':
            return list.sort((a, b) => time(b.endDate) - time(a.endDate));
        case 'abandoned':
            return list.sort((a, b) => time(b.startDate) - time(a.startDate));
    }
}
export function groupByStatus(games) {
    const groups = { pending: [], in_progress: [], paused: [], completed: [], abandoned: [] };
    for (const g of games)
        groups[getStatus(g)].push(g);
    for (const s of Object.keys(groups))
        groups[s] = sortGames(groups[s], s);
    return groups;
}
/** Color estable por plataforma (mismo nombre → mismo tono). */
export function platformHue(platform) {
    let h = 0;
    for (const ch of platform.toLowerCase())
        h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
}
