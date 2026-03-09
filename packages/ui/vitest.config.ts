import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

import { loadUiServicePorts } from "./config/service-ports"

const servicePorts = loadUiServicePorts(__dirname)

export default defineConfig({
    plugins: [react()],
    define: {
        __CODENAUTIC_UI_PORT__: JSON.stringify(servicePorts.ui),
        __CODENAUTIC_API_PORT__: JSON.stringify(servicePorts.api),
        __CODENAUTIC_UI_PREVIEW_PORT__: JSON.stringify(servicePorts.uiPreview),
        __CODENAUTIC_STORYBOOK_PORT__: JSON.stringify(servicePorts.storybook),
    },
    test: {
        environment: "happy-dom",
        globals: false,
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.test.{ts,tsx}"],
        coverage: {
            enabled: true,
            provider: "v8",
            thresholds: {
                lines: 75,
                functions: 75,
            },
            exclude: [
                "**/dist/**",
                "**/node_modules/**",
                "**/tests/**",
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
