import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// Política de seguridad solo en el build (en dev rompería el hot reload).
// Bloquea scripts de terceros y solo permite hablar con Apps Script.
const csp = {
    name: 'csp',
    apply: 'build',
    transformIndexHtml: () => [
        {
            tag: 'meta',
            attrs: {
                'http-equiv': 'Content-Security-Policy',
                content: [
                    "default-src 'self'",
                    "script-src 'self'",
                    "style-src 'self' 'unsafe-inline'",
                    "img-src 'self' data: https:",
                    'connect-src https://script.google.com https://script.googleusercontent.com https://en.wikipedia.org',
                    "font-src 'self'",
                    "base-uri 'self'",
                    "form-action 'none'",
                ].join('; '),
            },
            injectTo: 'head-prepend',
        },
    ],
};
export default defineConfig(({ command }) => ({
    base: command === 'build' ? '/game_backlog/' : '/',
    plugins: [react(), tailwindcss(), csp],
}));
