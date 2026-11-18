import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ApiError, postAction } from '../api';
import { Button, Dialog } from './Dialog';
/** Pide el token una vez y lo valida contra el Apps Script ("ping"). */
export function UnlockDialog({ open, onClose, onUnlocked }) {
    const [value, setValue] = useState('');
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState(null);
    async function submit(e) {
        e.preventDefault();
        const token = value.trim();
        if (!token)
            return;
        setChecking(true);
        setError(null);
        try {
            await postAction('ping', token);
            setValue('');
            onUnlocked(token);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo verificar el token.');
        }
        finally {
            setChecking(false);
        }
    }
    return (_jsx(Dialog, { open: open, onClose: onClose, title: "Activar edici\u00F3n", children: _jsxs("form", { onSubmit: submit, className: "space-y-4", children: [_jsxs("p", { className: "text-sm text-zinc-400", children: ["Peg\u00E1 tu token para poder modificar la planilla desde ac\u00E1. Se guarda ", _jsx("strong", { className: "text-zinc-200", children: "solo en este navegador" }), "."] }), _jsx("input", { type: "password", autoComplete: "off", spellCheck: false, autoFocus: true, value: value, onChange: (e) => setValue(e.target.value), placeholder: "Token", "aria-label": "Token", className: "w-full rounded-xl bg-zinc-950 px-4 py-3 font-mono text-sm ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-violet-400" }), error && _jsx("p", { className: "text-sm text-rose-300", children: error }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { type: "button", onClick: onClose, children: "Cancelar" }), _jsx(Button, { type: "submit", variant: "primary", disabled: !value.trim() || checking, children: checking ? 'Verificando…' : 'Activar' })] })] }) }));
}
