
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],

    base: "/2026admin/",

    server: {
        port: 5173,
        proxy: {
            "/api": "my-quiz-system.onrender.com"
        }
    }
});
