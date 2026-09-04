import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        host: true,
        // Allow sharing via a public tunnel (e.g. Cloudflare / ngrok).
        allowedHosts: true,
    },
    preview: {
        allowedHosts: true,
    },
});
