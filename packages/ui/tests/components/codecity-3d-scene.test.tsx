import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
    CodeCity3DScene,
    type ICodeCity3DSceneFileDescriptor,
} from "@/components/graphs/codecity-3d-scene"
import { renderWithProviders } from "../utils/render"

vi.mock("@/components/graphs/codecity-3d-scene-renderer", () => {
    return {
        CodeCity3DSceneRenderer: (props: {
            readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
        }): React.JSX.Element => {
            return <div>renderer-files:{props.files.length}</div>
        },
    }
})

const TEST_FILES: ReadonlyArray<ICodeCity3DSceneFileDescriptor> = [
    {
        complexity: 24,
        coverage: 82,
        id: "src/api/repository.ts",
        loc: 126,
        path: "src/api/repository.ts",
    },
]

describe("CodeCity3DScene", (): void => {
    it("показывает fallback при отсутствии WebGL", (): void => {
        const getContextSpy = vi
            .spyOn(HTMLCanvasElement.prototype, "getContext")
            .mockImplementation((): GPUCanvasContext | null => null)

        renderWithProviders(<CodeCity3DScene files={TEST_FILES} title="3D fallback scene" />)
        expect(screen.getByRole("status")).toHaveTextContent("WebGL unavailable")
        getContextSpy.mockRestore()
    })

    it("лениво загружает renderer при доступном WebGL", async (): Promise<void> => {
        const fakeContext = {} as GPUCanvasContext
        const getContextSpy = vi
            .spyOn(HTMLCanvasElement.prototype, "getContext")
            .mockImplementation((): GPUCanvasContext => fakeContext)

        renderWithProviders(<CodeCity3DScene files={TEST_FILES} title="3D loaded scene" />)
        await waitFor((): void => {
            expect(screen.getByText("renderer-files:1")).not.toBeNull()
        })
        getContextSpy.mockRestore()
    })
})
