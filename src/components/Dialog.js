import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
/** Modal basado en <dialog> nativo: Esc cierra, foco atrapado, accesible. */
export function Dialog({ open, onClose, title, children, wide = false }) {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        if (open && !el.open)
            el.showModal();
        if (!open && el.open)
            el.close();
    }, [open]);
    return (_jsx("dialog", { ref: ref, onClose: onClose, onClick: (e) => e.target === ref.current && onClose(), className: `m-auto ${wide ? 'w-[min(34rem,calc(100vw-2rem))]' : 'w-[min(26rem,calc(100vw-2rem))]'} rounded-3xl bg-zinc-900 p-0 text-zinc-100 shadow-2xl ring-1 ring-white/10 backdrop:bg-black/70 backdrop:backdrop-blur-sm`, children: open && (_jsxs("div", { className: "p-6", children: [_jsx("h2", { className: "font-display text-xl font-bold", children: title }), _jsx("div", { className: "mt-4", children: children })] })) }));
}
export function Button({ children, variant = 'secondary', className = '', ...props }) {
    const styles = {
        primary: 'bg-white text-zinc-900 hover:bg-zinc-200',
        success: 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300',
        secondary: 'bg-white/5 text-zinc-200 ring-1 ring-white/10 hover:bg-white/10',
    }[variant];
    return (_jsx("button", { ...props, className: `inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`, children: children }));
}
