import {afterEach, describe, expect, test} from "bun:test"
import {mkdtemp, rm, writeFile} from "fs/promises"
import {tmpdir} from "os"
import {join} from "path"

import type {ISettingsServiceConfig} from "../../src/settings-service/config/settings-config.module"
import {SettingsService} from "../../src/settings-service/settings.service"

const SETTINGS_SERVICE_NODE_ENV = "test"

function createConfig(filePath: string): ISettingsServiceConfig {
    return {
        runtime: {
            nodeEnv: SETTINGS_SERVICE_NODE_ENV,
            processName: "settings-service",
        },
        server: {
            host: "127.0.0.1",
            port: 3040,
            healthcheckEnabled: true,
        },
        data: {
            filePath,
        },
    }
}

describe("SettingsService", () => {
    let tempDir: string | undefined

    afterEach(async () => {
        if (tempDir !== undefined) {
            await rm(tempDir, {recursive: true, force: true})
            tempDir = undefined
        }
    })

    test("loads settings snapshot from file", async () => {
        tempDir = await mkdtemp(join(tmpdir(), "settings-service-"))
        const filePath = join(tempDir, "settings.json")
        const payload = {
            items: [
                {
                    key: "review.overrides",
                    value: {
                        name: "default-review-overrides",
                    },
                },
            ],
        }

        await writeFile(filePath, JSON.stringify(payload), "utf8")

        const service = new SettingsService(createConfig(filePath))
        const snapshot = await service.getAll()

        expect(snapshot.items).toHaveLength(1)
        expect(snapshot.items[0]?.key).toBe("review.overrides")
    })

    test("returns item by key", async () => {
        tempDir = await mkdtemp(join(tmpdir(), "settings-service-"))
        const filePath = join(tempDir, "settings.json")
        const payload = {
            items: [
                {
                    key: "review.overrides",
                    value: {
                        name: "default-review-overrides",
                    },
                },
            ],
        }

        await writeFile(filePath, JSON.stringify(payload), "utf8")

        const service = new SettingsService(createConfig(filePath))
        const item = await service.getByKey("review.overrides")

        expect(item?.value).toEqual({
            name: "default-review-overrides",
        })
    })

    test("throws when payload is invalid", async () => {
        tempDir = await mkdtemp(join(tmpdir(), "settings-service-"))
        const filePath = join(tempDir, "settings.json")
        await writeFile(filePath, JSON.stringify({}), "utf8")

        const service = new SettingsService(createConfig(filePath))

        return expect(service.getAll()).rejects.toThrow("Settings payload must contain items array")
    })
})
