import "reflect-metadata"

import {startSettingsService} from "./bootstrap"

if (import.meta.main) {
    await startSettingsService()
}
