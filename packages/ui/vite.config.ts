import path from "path"
import {sentryVitePlugin} from "@sentry/vite-plugin"
import {TanStackRouterVite} from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import {visualizer} from "rollup-plugin-visualizer"
import {defineConfig} from "vite"

import {createSecurityHeaders} from "./src/lib/security/security-headers"

const securityHeaders = createSecurityHeaders()

export default defineConfig(({mode}) => {
    const analyzeBundle = mode === "analyze"
    const plugins = [
        TanStackRouterVite({
            routesDirectory: "./src/routes",
            generatedRouteTree: "./src/routeTree.gen.ts",
        }),
        react(),
        sentryVitePlugin({
            org: process.env["SENTRY_ORG"],
            project: process.env["SENTRY_PROJECT"],
            authToken: process.env["SENTRY_AUTH_TOKEN"],
            disable: process.env["SENTRY_AUTH_TOKEN"] === undefined,
            sourcemaps: {
                filesToDeleteAfterUpload: ["**/*.map"],
            },
            telemetry: false,
        }),
    ]

    if (analyzeBundle) {
        plugins.push(
            visualizer({
                filename: "dist/bundle-analysis.json",
                template: "raw-data",
                gzipSize: true,
                brotliSize: true,
            }),
        )
    }

    return {
        plugins,
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "src"),
            },
        },
        server: {
            port: 3000,
            headers: securityHeaders,
        },
        preview: {
            headers: securityHeaders,
        },
        build: {
            sourcemap: true,
            manifest: true,
        },
    }
})
