import { describe, expect, it } from "vitest"

import {
    resolveBlueprintNodeKind,
    parseBlueprintYaml,
    buildBlueprintHighlightLines,
} from "@/pages/settings-contract-validation/blueprint-parser"

describe("resolveBlueprintNodeKind", (): void => {
    it("when key is 'layers', then returns 'layer'", (): void => {
        expect(resolveBlueprintNodeKind("layers")).toBe("layer")
    })

    it("when key is 'name', then returns 'layer'", (): void => {
        expect(resolveBlueprintNodeKind("name")).toBe("layer")
    })

    it("when key is 'rules', then returns 'rule'", (): void => {
        expect(resolveBlueprintNodeKind("rules")).toBe("rule")
    })

    it("when key is 'source', then returns 'rule'", (): void => {
        expect(resolveBlueprintNodeKind("source")).toBe("rule")
    })

    it("when key is 'mode', then returns 'rule'", (): void => {
        expect(resolveBlueprintNodeKind("mode")).toBe("rule")
    })

    it("when key is unknown, then returns 'metadata'", (): void => {
        expect(resolveBlueprintNodeKind("version")).toBe("metadata")
    })
})

describe("parseBlueprintYaml", (): void => {
    it("when valid YAML with layers and rules, then returns no errors", (): void => {
        const yaml = "layers:\n  - name: domain\nrules:\n  - source: domain"
        const result = parseBlueprintYaml(yaml)

        expect(result.errors).toHaveLength(0)
        expect(result.nodes.length).toBeGreaterThan(0)
    })

    it("when missing layers section, then returns error", (): void => {
        const yaml = "rules:\n  - source: domain"
        const result = parseBlueprintYaml(yaml)

        expect(result.errors.some((error): boolean => error.includes("layers"))).toBe(true)
    })

    it("when missing rules section, then returns error", (): void => {
        const yaml = "layers:\n  - name: domain"
        const result = parseBlueprintYaml(yaml)

        expect(result.errors.some((error): boolean => error.includes("rules"))).toBe(true)
    })

    it("when line contains tabs, then reports error", (): void => {
        const yaml = "layers:\n\t- name: domain\nrules:\n  - source: domain"
        const result = parseBlueprintYaml(yaml)

        expect(result.errors.some((error): boolean => error.includes("tabs"))).toBe(true)
    })

    it("when line has no key-value separator, then reports error", (): void => {
        const yaml = "layers:\n  - name: domain\nrules:\n  invalid-line"
        const result = parseBlueprintYaml(yaml)

        expect(result.errors.some((error): boolean => error.includes("key-value"))).toBe(true)
    })

    it("when YAML has comments and empty lines, then skips them", (): void => {
        const yaml = "# comment\n\nlayers:\n  - name: domain\n\nrules:\n  - source: domain"
        const result = parseBlueprintYaml(yaml)

        expect(result.errors).toHaveLength(0)
    })

    it("when Windows line endings, then normalizes them", (): void => {
        const yaml = "layers:\r\n  - name: domain\r\nrules:\r\n  - source: domain"
        const result = parseBlueprintYaml(yaml)

        expect(result.errors).toHaveLength(0)
    })
})

describe("buildBlueprintHighlightLines", (): void => {
    it("when given key-value YAML lines, then extracts keys and values", (): void => {
        const yaml = "name: test\nversion: 1"
        const lines = buildBlueprintHighlightLines(yaml)

        expect(lines).toHaveLength(2)
        expect(lines[0]?.key).toBe("name")
        expect(lines[0]?.value).toBe("test")
    })

    it("when given comment lines, then marks them as comments", (): void => {
        const yaml = "# this is a comment"
        const lines = buildBlueprintHighlightLines(yaml)

        expect(lines[0]?.comment).toBe("# this is a comment")
    })

    it("when given indented lines, then captures indentation", (): void => {
        const yaml = "  key: value"
        const lines = buildBlueprintHighlightLines(yaml)

        expect(lines[0]?.indent).toBe(2)
    })

    it("when given list items, then parses key from item", (): void => {
        const yaml = "  - source: domain"
        const lines = buildBlueprintHighlightLines(yaml)

        expect(lines[0]?.key).toBe("source")
        expect(lines[0]?.value).toBe("domain")
    })

    it("when given empty line, then returns value as empty string", (): void => {
        const yaml = ""
        const lines = buildBlueprintHighlightLines(yaml)

        expect(lines).toHaveLength(1)
        expect(lines[0]?.value).toBe("")
    })
})
