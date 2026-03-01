import {describe, expect, test} from "bun:test"

import {Entity} from "../../../src/domain/entities/entity"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

interface IStubProps {
    label: string
}

class StubEntity extends Entity<IStubProps> {
    public constructor(id: UniqueId, props: IStubProps) {
        super(id, props)
    }
}

describe("Entity", () => {
    test("compares identity by id", () => {
        const id = UniqueId.create("entity-1")
        const left = new StubEntity(id, {label: "left"})
        const right = new StubEntity(id, {label: "right"})
        const different = new StubEntity(UniqueId.create("entity-2"), {label: "diff"})

        expect(left.equals(right)).toBe(true)
        expect(left.equals(different)).toBe(false)
    })
})
