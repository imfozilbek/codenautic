import {describe, expect, test} from "bun:test"

import {Project, type IProjectProps} from "../../../src/domain/entities/project.entity"
import {OrganizationId} from "../../../src/domain/value-objects/organization-id.value-object"
import {RepositoryId} from "../../../src/domain/value-objects/repository-id.value-object"
import {ProjectSettings} from "../../../src/domain/value-objects/project-settings.value-object"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("Project", () => {
    test("creates project with normalized identifiers and settings", () => {
        const project = new Project(UniqueId.create(), createProjectProps({
            repositoryId: "  gh:repo-main  ",
            organizationId: "org-1",
            integrations: ["API", "api", " Web "],
            settings: {
                severity: "high",
                ignorePaths: ["  src/** "],
                cadence: "manual",
                customRuleIds: ["rule-1", "rule-1", "rule-2"],
            },
        }))

        expect(project.repositoryId.toString()).toBe("gh:repo-main")
        expect(project.organizationId.value).toBe("org-1")
        expect(project.settings.severity).toBe("HIGH")
        expect(project.settings.ignorePaths).toEqual(["src/**"])
        expect(project.integrations).toEqual(["api", "web"])
    })

    test("adds integration and rejects duplicate", () => {
        const project = new Project(UniqueId.create(), createProjectProps({
            repositoryId: "gl:repo-1",
            organizationId: "org-2",
            integrations: ["llm"],
        }))

        project.addIntegration("Queue")

        expect(project.integrations).toEqual(["llm", "queue"])

        expect(() => {
            project.addIntegration(" QUEUE ")
        }).toThrow("Integration queue already exists")
    })

    test("updates settings by replacement rules", () => {
        const project = new Project(UniqueId.create(), createProjectProps({
            repositoryId: "gl:repo-2",
            organizationId: "org-3",
            settings: {
                severity: "low",
                ignorePaths: ["src/**"],
                limits: {maxFiles: 10},
                customRuleIds: ["rule-1"],
            },
        }))

        project.updateSettings({
            severity: "critical",
            ignorePaths: ["lib/**"],
            limits: {maxFiles: 20},
        })

        expect(project.settings.severity).toBe("CRITICAL")
        expect(project.settings.ignorePaths).toEqual(["lib/**"])
        expect(project.settings.limits).toEqual({maxFiles: 20})
        expect(project.settings.customRuleIds).toEqual(["rule-1"])
    })

    test("throws when repository id is invalid", () => {
        expect(() => {
            void new Project(UniqueId.create(), createProjectProps({
                repositoryId: "bad-repo",
                organizationId: "org-4",
            }))
        }).toThrow("RepositoryId must match format <platform>:<id>")
    })

    test("throws when repositoryId is missing", () => {
        expect(() => {
            void new Project(UniqueId.create(), {
                repositoryId: undefined as unknown as RepositoryId,
                organizationId: OrganizationId.create("org-10"),
                settings: ProjectSettings.create(),
                integrations: [],
            })
        }).toThrow("Project repositoryId must be defined")
    })

    test("throws when organizationId is missing", () => {
        expect(() => {
            void new Project(UniqueId.create(), {
                repositoryId: RepositoryId.parse("gl:repo-10"),
                organizationId: undefined as unknown as OrganizationId,
                settings: ProjectSettings.create(),
                integrations: [],
            })
        }).toThrow("Project organizationId must be defined")
    })

    test("throws when settings are missing", () => {
        expect(() => {
            void new Project(UniqueId.create(), {
                repositoryId: RepositoryId.parse("gl:repo-11"),
                organizationId: OrganizationId.create("org-11"),
                settings: undefined as unknown as ProjectSettings,
                integrations: [],
            })
        }).toThrow("Project settings must be defined")
    })

    test("throws when integration is empty", () => {
        expect(() => {
            void new Project(UniqueId.create(), createProjectProps({
                repositoryId: "gl:repo-12",
                organizationId: "org-12",
                integrations: ["   "],
            }))
        }).toThrow("Integration cannot be empty")
    })

    test("allows global organization scope", () => {
        const project = new Project(UniqueId.create(), createProjectProps({
            repositoryId: "az:repo-3",
            organizationId: null,
            integrations: [],
        }))

        expect(project.organizationId.isGlobal()).toBe(true)
    })
})

function createProjectProps(overrides: {
    repositoryId: string
    organizationId: string | null
    settings?: {
        severity?: string
        ignorePaths?: readonly string[]
        cadence?: string
        limits?: Record<string, number>
        customRuleIds?: readonly string[]
        promptOverrides?: Record<string, unknown>
    }
    integrations?: readonly string[]
}): IProjectProps {
    return {
        repositoryId: RepositoryId.parse(overrides.repositoryId),
        organizationId: OrganizationId.create(overrides.organizationId),
        settings: ProjectSettings.create(overrides.settings),
        integrations: [...(overrides.integrations ?? [])],
    }
}
