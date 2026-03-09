import { describe, expect, it } from "vitest"

import {
    parseContractEnvelope,
    parseGuardrailsYaml,
    SUPPORTED_SCHEMA,
} from "@/pages/settings-contract-validation/contract-validator"

describe("parseContractEnvelope", (): void => {
    const validEnvelope = {
        schema: SUPPORTED_SCHEMA,
        version: 2,
        type: "theme-library",
        payload: { colors: [] },
    }

    it("when given valid envelope, then returns no errors with normalized envelope", (): void => {
        const result = parseContractEnvelope(JSON.stringify(validEnvelope))

        expect(result.errors).toHaveLength(0)
        expect(result.normalizedEnvelope).toBeDefined()
        expect(result.normalizedEnvelope?.schema).toBe(SUPPORTED_SCHEMA)
    })

    it("when given invalid JSON, then returns parse error", (): void => {
        const result = parseContractEnvelope("not-json")

        expect(result.errors).toHaveLength(1)
        expect(result.errors[0]).toContain("Invalid JSON")
    })

    it("when root is not an object, then returns error", (): void => {
        const result = parseContractEnvelope('"just-a-string"')

        expect(result.errors.some((error): boolean => error.includes("object"))).toBe(true)
    })

    it("when schema is unsupported, then returns error", (): void => {
        const envelope = { ...validEnvelope, schema: "wrong.schema.v1" }
        const result = parseContractEnvelope(JSON.stringify(envelope))

        expect(result.errors.some((error): boolean => error.includes("schema"))).toBe(true)
    })

    it("when version is missing, then returns error", (): void => {
        const envelope = { schema: SUPPORTED_SCHEMA, type: "theme-library", payload: {} }
        const result = parseContractEnvelope(JSON.stringify(envelope))

        expect(result.errors.some((error): boolean => error.includes("Version"))).toBe(true)
    })

    it("when version is unsupported number, then returns error", (): void => {
        const envelope = { ...validEnvelope, version: 99 }
        const result = parseContractEnvelope(JSON.stringify(envelope))

        expect(result.errors.some((error): boolean => error.includes("not supported"))).toBe(true)
    })

    it("when type is invalid, then returns error", (): void => {
        const envelope = { ...validEnvelope, type: "unknown-type" }
        const result = parseContractEnvelope(JSON.stringify(envelope))

        expect(result.errors.some((error): boolean => error.includes("Type"))).toBe(true)
    })

    it("when payload is missing, then returns error", (): void => {
        const envelope = { schema: SUPPORTED_SCHEMA, version: 2, type: "theme-library" }
        const result = parseContractEnvelope(JSON.stringify(envelope))

        expect(result.errors.some((error): boolean => error.includes("Payload"))).toBe(true)
    })

    it("when version is 1 and all else is valid, then returns migration hint", (): void => {
        const envelope = { ...validEnvelope, version: 1 }
        const result = parseContractEnvelope(JSON.stringify(envelope))

        expect(result.errors).toHaveLength(0)
        expect(result.migrationHints.length).toBeGreaterThan(0)
    })

    it("when type is 'rules-library', then accepts it", (): void => {
        const envelope = { ...validEnvelope, type: "rules-library" }
        const result = parseContractEnvelope(JSON.stringify(envelope))

        expect(result.errors).toHaveLength(0)
    })
})

describe("parseGuardrailsYaml", (): void => {
    it("when given valid guardrail rules, then parses them correctly", (): void => {
        const yaml = "rules:\n  - source: domain\n    target: infrastructure\n    mode: forbid"
        const result = parseGuardrailsYaml(yaml)

        expect(result.rules).toHaveLength(1)
        expect(result.rules[0]?.source).toBe("domain")
        expect(result.rules[0]?.target).toBe("infrastructure")
        expect(result.rules[0]?.mode).toBe("forbid")
    })

    it("when no rules are parsed, then returns error", (): void => {
        const yaml = "# just comments"
        const result = parseGuardrailsYaml(yaml)

        expect(result.errors.some((error): boolean => error.includes("at least one rule"))).toBe(
            true,
        )
    })

    it("when line contains tabs, then reports error", (): void => {
        const yaml = "rules:\n\t- source: domain"
        const result = parseGuardrailsYaml(yaml)

        expect(result.errors.some((error): boolean => error.includes("tabs"))).toBe(true)
    })

    it("when source is empty, then reports error", (): void => {
        const yaml = "rules:\n  - source:\n    target: infra\n    mode: forbid"
        const result = parseGuardrailsYaml(yaml)

        expect(result.errors.some((error): boolean => error.includes("source is required"))).toBe(
            true,
        )
    })

    it("when target is empty, then reports error", (): void => {
        const yaml = "rules:\n  - source: domain\n    target:\n    mode: forbid"
        const result = parseGuardrailsYaml(yaml)

        expect(result.errors.some((error): boolean => error.includes("target is required"))).toBe(
            true,
        )
    })

    it("when mode is invalid, then reports error", (): void => {
        const yaml = "rules:\n  - source: domain\n    target: infra\n    mode: warn"
        const result = parseGuardrailsYaml(yaml)

        expect(result.errors.some((error): boolean => error.includes("allow or forbid"))).toBe(true)
    })

    it("when mode appears without source/target, then reports error", (): void => {
        const yaml = "rules:\n  - mode: forbid"
        const result = parseGuardrailsYaml(yaml)

        expect(result.errors.some((error): boolean => error.includes("source and target"))).toBe(
            true,
        )
    })

    it("when mode is 'allow', then accepts it", (): void => {
        const yaml = "rules:\n  - source: app\n    target: domain\n    mode: allow"
        const result = parseGuardrailsYaml(yaml)

        expect(result.rules).toHaveLength(1)
        expect(result.rules[0]?.mode).toBe("allow")
    })
})
