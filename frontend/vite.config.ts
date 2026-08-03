import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// When the app runs inside Docker, point BACKEND_URL at
// http://host.docker.internal:4001 instead of localhost.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4001";

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: backendUrl,
                changeOrigin: true,
            },
        },
    },
});
