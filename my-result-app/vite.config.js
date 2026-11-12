
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],

    base: "/2026admin/",

    server: {
        port: 5173,

        proxy: {
            "/api": {
                target: "https://my-quiz-system.onrender.com",
                changeOrigin: true,
                secure: true
            }
        }
    }
});
