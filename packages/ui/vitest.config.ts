import {defineConfig} from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "happy-dom",
        globals: false,
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.test.{ts,tsx}"],
        coverage: {
            enabled: true,
            provider: "v8",
            thresholds: {
                lines: 99,
                functions: 99,
            },
            exclude: [
                "**/dist/**",
                "**/node_modules/**",
                "**/tests/**",
                "**/sign-in/page.tsx",
                "**/components/ui/**",
                "**/messages/**",
                "**/mock-data/**",
                "**/index.ts",
                "**/*.types.ts",
            ],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
})
