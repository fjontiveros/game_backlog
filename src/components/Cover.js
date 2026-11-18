import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useCover } from '../covers';
import { platformHue } from '../games';
/** Carátula con placeholder generado (degradé + iniciales) mientras carga o si no hay. */
export function Cover({ title, platform, override, className = '', imgClassName = '' }) {
    const { ref, url } = useCover(title, override);
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    const hue = platformHue(platform ?? title);
    return (_jsxs("div", { ref: ref, className: `overflow-hidden ${className}`, children: [_jsx("div", { className: "absolute inset-0 grid place-items-center", style: { background: `linear-gradient(145deg, hsl(${hue} 55% 32%), hsl(${(hue + 50) % 360} 60% 12%))` }, children: _jsx("span", { className: "font-display text-4xl font-bold text-white/25 select-none", children: initials(title) }) }), url && !failed && (_jsx("img", { src: url, alt: `Carátula de ${title}`, loading: "lazy", referrerPolicy: "no-referrer", onLoad: () => setLoaded(true), onError: () => setFailed(true), className: `absolute inset-0 size-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}` }))] }));
}
function initials(title) {
    return title
        .split(/[\s:\-]+/)
        .filter((w) => /^[\p{L}\p{N}]/u.test(w))
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');
}
