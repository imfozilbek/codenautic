import { describe, expect, it } from "vitest"

import {
    buildTemplateDiffLine,
    convertFormValuesToTemplateState,
    createBulkScanJobs,
    formatBooleanForSummary,
    formatTemplateTags,
    getTemplateById,
    isBulkScanTerminal,
    isTemplateStateEqual,
    mapBulkProgressClasses,
    mapBulkStatusClasses,
    mapBulkStatusLabel,
    mapProviderLabel,
    mapTemplateToFormState,
    ONBOARDING_TEMPLATES,
    parseTemplateTags,
    splitTemplateTagsForPreview,
    summarizeBulkScanJobs,
    TEMPLATE_OPTIONS,
    toAppliedTemplateMeta,
} from "@/pages/onboarding-wizard/onboarding-templates"
import type {
    IBulkScanJob,
    IOnboardingFormValues,
    IOnboardingTemplateFormState,
} from "@/pages/onboarding-wizard/onboarding-wizard-types"

describe("onboarding-templates", (): void => {
    describe("getTemplateById", (): void => {
        it("when given existing id, then returns matching template", (): void => {
            const result = getTemplateById("security-baseline")

            expect(result).toBeDefined()
            expect(result?.name).toBe("Security Baseline")
        })

        it("when given custom id, then returns undefined", (): void => {
            const result = getTemplateById("custom")

            expect(result).toBeUndefined()
        })

        it("when given unknown id, then returns undefined", (): void => {
            const result = getTemplateById("nonexistent" as "custom")

            expect(result).toBeUndefined()
        })
    })

    describe("createBulkScanJobs", (): void => {
        it("when given 1 URL, then first job is running with 12% progress", (): void => {
            const result = createBulkScanJobs(["https://github.com/org/repo1"])

            expect(result).toHaveLength(1)
            expect(result[0]?.status).toBe("running")
            expect(result[0]?.progress).toBe(12)
        })

        it("when given 2 URLs, then second job is error with details", (): void => {
            const urls = ["https://github.com/org/repo1", "https://github.com/org/repo2"]
            const result = createBulkScanJobs(urls)

            expect(result).toHaveLength(2)
            expect(result[1]?.status).toBe("error")
            expect(result[1]?.errorMessage).toBe(
                "Сканирование прервано: ошибка доступа к репозиторию",
            )
            expect(result[1]?.errorDetails).toHaveLength(2)
        })

        it("when given 3+ URLs, then remaining jobs are queued", (): void => {
            const urls = [
                "https://github.com/org/repo1",
                "https://github.com/org/repo2",
                "https://github.com/org/repo3",
                "https://github.com/org/repo4",
            ]
            const result = createBulkScanJobs(urls)

            expect(result[2]?.status).toBe("queued")
            expect(result[2]?.progress).toBe(0)
            expect(result[3]?.status).toBe("queued")
        })

        it("when given empty array, then returns empty result", (): void => {
            const result = createBulkScanJobs([])

            expect(result).toHaveLength(0)
        })
    })

    describe("mapBulkStatusLabel", (): void => {
        it("when status is running, then returns 'В процессе'", (): void => {
            expect(mapBulkStatusLabel("running")).toBe("В процессе")
        })

        it("when status is queued, then returns 'В очереди'", (): void => {
            expect(mapBulkStatusLabel("queued")).toBe("В очереди")
        })

        it("when status is paused, then returns 'Пауза'", (): void => {
            expect(mapBulkStatusLabel("paused")).toBe("Пауза")
        })

        it("when status is completed, then returns 'Готово'", (): void => {
            expect(mapBulkStatusLabel("completed")).toBe("Готово")
        })

        it("when status is cancelled, then returns 'Отменено'", (): void => {
            expect(mapBulkStatusLabel("cancelled")).toBe("Отменено")
        })

        it("when status is error, then returns 'Ошибка'", (): void => {
            expect(mapBulkStatusLabel("error")).toBe("Ошибка")
        })
    })

    describe("mapBulkStatusClasses", (): void => {
        it("when status is running, then returns accent classes", (): void => {
            expect(mapBulkStatusClasses("running")).toContain("text-accent")
        })

        it("when status is queued, then returns surface classes", (): void => {
            expect(mapBulkStatusClasses("queued")).toContain("bg-surface")
        })

        it("when status is paused, then returns warning classes", (): void => {
            expect(mapBulkStatusClasses("paused")).toContain("text-warning")
        })

        it("when status is completed, then returns success classes", (): void => {
            expect(mapBulkStatusClasses("completed")).toContain("text-success")
        })

        it("when status is cancelled, then returns muted classes", (): void => {
            expect(mapBulkStatusClasses("cancelled")).toContain("text-muted")
        })

        it("when status is error, then returns danger classes", (): void => {
            expect(mapBulkStatusClasses("error")).toContain("text-danger")
        })
    })

    describe("mapBulkProgressClasses", (): void => {
        it("when status is running, then returns bg-accent", (): void => {
            expect(mapBulkProgressClasses("running")).toBe("bg-accent")
        })

        it("when status is error, then returns bg-danger", (): void => {
            expect(mapBulkProgressClasses("error")).toBe("bg-danger")
        })

        it("when status is paused, then returns bg-warning", (): void => {
            expect(mapBulkProgressClasses("paused")).toBe("bg-warning")
        })

        it("when status is completed, then returns bg-success", (): void => {
            expect(mapBulkProgressClasses("completed")).toBe("bg-success")
        })

        it("when status is queued, then returns bg-surface-secondary", (): void => {
            expect(mapBulkProgressClasses("queued")).toBe("bg-surface-secondary")
        })

        it("when status is cancelled, then returns bg-surface-secondary", (): void => {
            expect(mapBulkProgressClasses("cancelled")).toBe("bg-surface-secondary")
        })
    })

    describe("summarizeBulkScanJobs", (): void => {
        it("when given empty array, then returns all zeroes", (): void => {
            const result = summarizeBulkScanJobs([])

            expect(result).toEqual({
                running: 0,
                queued: 0,
                paused: 0,
                error: 0,
                completed: 0,
                cancelled: 0,
            })
        })

        it("when given mixed statuses, then counts each correctly", (): void => {
            const jobs: ReadonlyArray<IBulkScanJob> = [
                { id: "1", repositoryUrl: "a", status: "running", progress: 10 },
                { id: "2", repositoryUrl: "b", status: "queued", progress: 0 },
                { id: "3", repositoryUrl: "c", status: "paused", progress: 20 },
                { id: "4", repositoryUrl: "d", status: "error", progress: 50 },
                { id: "5", repositoryUrl: "e", status: "completed", progress: 100 },
                { id: "6", repositoryUrl: "f", status: "cancelled", progress: 0 },
            ]
            const result = summarizeBulkScanJobs(jobs)

            expect(result).toEqual({
                running: 1,
                queued: 1,
                paused: 1,
                error: 1,
                completed: 1,
                cancelled: 1,
            })
        })
    })

    describe("parseTemplateTags", (): void => {
        it("when given comma-separated tags, then splits and trims", (): void => {
            const result = parseTemplateTags("security, core , baseline")

            expect(result).toEqual(["security", "core", "baseline"])
        })

        it("when given duplicates, then deduplicates", (): void => {
            const result = parseTemplateTags("security, security, core")

            expect(result).toEqual(["security", "core"])
        })

        it("when given empty string, then returns empty array", (): void => {
            const result = parseTemplateTags("")

            expect(result).toEqual([])
        })

        it("when given only commas, then returns empty array", (): void => {
            const result = parseTemplateTags(",,,")

            expect(result).toEqual([])
        })
    })

    describe("formatTemplateTags", (): void => {
        it("when given tags, then joins with comma", (): void => {
            expect(formatTemplateTags(["security", "core"])).toBe("security, core")
        })

        it("when given empty array, then returns 'без тегов'", (): void => {
            expect(formatTemplateTags([])).toBe("без тегов")
        })
    })

    describe("splitTemplateTagsForPreview", (): void => {
        it("when given tags, then returns same array", (): void => {
            const tags = ["a", "b"]
            expect(splitTemplateTagsForPreview(tags)).toEqual(["a", "b"])
        })

        it("when given empty, then returns empty", (): void => {
            expect(splitTemplateTagsForPreview([])).toEqual([])
        })
    })

    describe("convertFormValuesToTemplateState", (): void => {
        it("when given form values, then extracts template-related fields", (): void => {
            const values: IOnboardingFormValues = {
                provider: "github",
                onboardingTemplateId: "custom",
                onboardingMode: "single",
                repositoryUrl: "https://github.com/org/repo",
                repositoryUrlList: "",
                scanMode: "full",
                scanSchedule: "daily",
                scanThreads: 8,
                includeSubmodules: true,
                includeHistory: false,
                tags: "security, core",
                notifyEmail: "dev@example.com",
            }
            const result = convertFormValuesToTemplateState(values)

            expect(result.scanMode).toBe("full")
            expect(result.scanSchedule).toBe("daily")
            expect(result.scanThreads).toBe(8)
            expect(result.includeSubmodules).toBe(true)
            expect(result.includeHistory).toBe(false)
            expect(result.notifyEmail).toBe("dev@example.com")
            expect(result.tags).toEqual(["security", "core"])
        })
    })

    describe("mapTemplateToFormState", (): void => {
        it("when given template, then returns form state", (): void => {
            const template = ONBOARDING_TEMPLATES[0]
            if (template === undefined) {
                throw new Error("Template not found")
            }

            const result = mapTemplateToFormState(template)

            expect(result.scanMode).toBe("full")
            expect(result.scanSchedule).toBe("daily")
            expect(result.scanThreads).toBe(8)
            expect(result.tags).toEqual(["security", "policy", "sensitive"])
        })
    })

    describe("isTemplateStateEqual", (): void => {
        const base: IOnboardingTemplateFormState = {
            scanMode: "full",
            scanSchedule: "daily",
            scanThreads: 8,
            includeSubmodules: true,
            includeHistory: true,
            notifyEmail: "dev@example.com",
            tags: ["security", "core"],
        }

        it("when both states are identical, then returns true", (): void => {
            expect(isTemplateStateEqual(base, { ...base, tags: [...base.tags] })).toBe(true)
        })

        it("when scanMode differs, then returns false", (): void => {
            expect(isTemplateStateEqual(base, { ...base, scanMode: "delta" })).toBe(false)
        })

        it("when scanSchedule differs, then returns false", (): void => {
            expect(isTemplateStateEqual(base, { ...base, scanSchedule: "hourly" })).toBe(false)
        })

        it("when scanThreads differs, then returns false", (): void => {
            expect(isTemplateStateEqual(base, { ...base, scanThreads: 2 })).toBe(false)
        })

        it("when includeSubmodules differs, then returns false", (): void => {
            expect(isTemplateStateEqual(base, { ...base, includeSubmodules: false })).toBe(false)
        })

        it("when includeHistory differs, then returns false", (): void => {
            expect(isTemplateStateEqual(base, { ...base, includeHistory: false })).toBe(false)
        })

        it("when notifyEmail differs, then returns false", (): void => {
            expect(isTemplateStateEqual(base, { ...base, notifyEmail: "other@example.com" })).toBe(
                false,
            )
        })

        it("when tags length differs, then returns false", (): void => {
            expect(isTemplateStateEqual(base, { ...base, tags: ["security"] })).toBe(false)
        })

        it("when tags content differs, then returns false", (): void => {
            expect(isTemplateStateEqual(base, { ...base, tags: ["security", "different"] })).toBe(
                false,
            )
        })

        it("when tags are empty on both, then returns true", (): void => {
            expect(isTemplateStateEqual({ ...base, tags: [] }, { ...base, tags: [] })).toBe(true)
        })
    })

    describe("toAppliedTemplateMeta", (): void => {
        it("when template is undefined, then returns custom meta", (): void => {
            const result = toAppliedTemplateMeta("custom", undefined)

            expect(result.id).toBe("custom")
            expect(result.name).toBe("Ручная настройка")
            expect(result.rulesPreset).toBe("manual")
            expect(result.tags).toEqual([])
            expect(result.version).toBe("draft")
        })

        it("when template is provided, then returns template meta", (): void => {
            const template = ONBOARDING_TEMPLATES[0]
            if (template === undefined) {
                throw new Error("Template not found")
            }

            const result = toAppliedTemplateMeta("security-baseline", template)

            expect(result.id).toBe("security-baseline")
            expect(result.name).toBe("Security Baseline")
            expect(result.rulesPreset).toBe("security-first")
            expect(result.tags).toEqual(["security", "policy", "sensitive"])
        })
    })

    describe("buildTemplateDiffLine", (): void => {
        it("when values are equal, then returns 'оставляем' format", (): void => {
            expect(buildTemplateDiffLine("Mode", "full", "full")).toBe("Mode: оставляем full")
        })

        it("when values differ, then returns arrow format", (): void => {
            expect(buildTemplateDiffLine("Mode", "incremental", "full")).toBe(
                "Mode: incremental → full",
            )
        })
    })

    describe("isBulkScanTerminal", (): void => {
        it("when status is completed, then returns true", (): void => {
            expect(isBulkScanTerminal("completed")).toBe(true)
        })

        it("when status is error, then returns true", (): void => {
            expect(isBulkScanTerminal("error")).toBe(true)
        })

        it("when status is cancelled, then returns true", (): void => {
            expect(isBulkScanTerminal("cancelled")).toBe(true)
        })

        it("when status is running, then returns false", (): void => {
            expect(isBulkScanTerminal("running")).toBe(false)
        })

        it("when status is queued, then returns false", (): void => {
            expect(isBulkScanTerminal("queued")).toBe(false)
        })

        it("when status is paused, then returns false", (): void => {
            expect(isBulkScanTerminal("paused")).toBe(false)
        })
    })

    describe("formatBooleanForSummary", (): void => {
        it("when true, then returns 'Да'", (): void => {
            expect(formatBooleanForSummary(true)).toBe("Да")
        })

        it("when false, then returns 'Нет'", (): void => {
            expect(formatBooleanForSummary(false)).toBe("Нет")
        })
    })

    describe("mapProviderLabel", (): void => {
        it("when provider is github, then returns 'GitHub'", (): void => {
            expect(mapProviderLabel("github")).toBe("GitHub")
        })

        it("when provider is gitlab, then returns 'GitLab'", (): void => {
            expect(mapProviderLabel("gitlab")).toBe("GitLab")
        })

        it("when provider is bitbucket, then returns 'Bitbucket'", (): void => {
            expect(mapProviderLabel("bitbucket")).toBe("Bitbucket")
        })
    })

    describe("TEMPLATE_OPTIONS", (): void => {
        it("when accessed, then contains custom and all template entries", (): void => {
            expect(TEMPLATE_OPTIONS[0]?.value).toBe("custom")
            expect(TEMPLATE_OPTIONS[0]?.label).toBe("Ручная настройка")
            expect(TEMPLATE_OPTIONS).toHaveLength(ONBOARDING_TEMPLATES.length + 1)
        })
    })

    describe("ONBOARDING_TEMPLATES", (): void => {
        it("when accessed, then contains 3 predefined templates", (): void => {
            expect(ONBOARDING_TEMPLATES).toHaveLength(3)
            expect(ONBOARDING_TEMPLATES.map((t): string => t.id)).toEqual([
                "security-baseline",
                "quality-scan",
                "fast-onboarding",
            ])
        })
    })
})
