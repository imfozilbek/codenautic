import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import os from "node:os"

import { describe, expect, test } from "bun:test"

import { loadRuntimeServicePorts, resolveDefaultApiPort } from "../../src/config/service-ports"

describe("runtime service ports", () => {
    test("loads centralized runtime service ports from repository registry", () => {
        expect(loadRuntimeServicePorts()).toEqual({
            api: 7120,
            settingsService: 7130,
            webhooks: 7140,
            mcpSse: 7210,
        })
    })

    test("resolves centralized api port", () => {
        expect(resolveDefaultApiPort()).toBe(7120)
    })

    test("returns fallback ports when repository registry is not found", () => {
        const isolatedDirectory = mkdtempSync(path.join(os.tmpdir(), "codenautic-runtime-ports-"))

        try {
            expect(loadRuntimeServicePorts(isolatedDirectory)).toEqual({
                api: 7120,
                settingsService: 7130,
                webhooks: 7140,
                mcpSse: 7210,
            })
            expect(resolveDefaultApiPort(isolatedDirectory)).toBe(7120)
        } finally {
            rmSync(isolatedDirectory, { recursive: true, force: true })
        }
    })

    test("returns fallback ports when registry contains invalid data", () => {
        const isolatedDirectory = mkdtempSync(path.join(os.tmpdir(), "codenautic-runtime-ports-"))
        const configDirectory = path.join(isolatedDirectory, "config")
        const nestedDirectory = path.join(isolatedDirectory, "packages", "runtime")

        mkdirSync(configDirectory, { recursive: true })
        mkdirSync(nestedDirectory, { recursive: true })
        writeFileSync(
            path.join(configDirectory, "service-ports.json"),
            JSON.stringify({
                services: {
                    api: 0,
                    settingsService: 7130,
                    webhooks: 7140,
                    mcpSse: 7210,
                },
            }),
        )

        try {
            expect(loadRuntimeServicePorts(nestedDirectory)).toEqual({
                api: 7120,
                settingsService: 7130,
                webhooks: 7140,
                mcpSse: 7210,
            })
        } finally {
            rmSync(isolatedDirectory, { recursive: true, force: true })
        }
    })

    test("returns fallback ports when registry json is malformed", () => {
        const isolatedDirectory = mkdtempSync(path.join(os.tmpdir(), "codenautic-runtime-ports-"))
        const configDirectory = path.join(isolatedDirectory, "config")

        mkdirSync(configDirectory, { recursive: true })
        writeFileSync(path.join(configDirectory, "service-ports.json"), "{invalid-json")

        try {
            expect(loadRuntimeServicePorts(isolatedDirectory)).toEqual({
                api: 7120,
                settingsService: 7130,
                webhooks: 7140,
                mcpSse: 7210,
            })
        } finally {
            rmSync(isolatedDirectory, { recursive: true, force: true })
        }
    })
})
