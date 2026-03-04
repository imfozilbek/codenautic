import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    CodeCity3DScene,
    type TCodeCityCameraPreset,
    type ICodeCity3DSceneImpactedFileDescriptor,
    type ICodeCity3DSceneFileDescriptor,
} from "@/components/graphs/codecity-3d-scene"
import { renderWithProviders } from "../utils/render"

vi.mock("@/components/graphs/codecity-3d-scene-renderer", () => {
    return {
        CodeCity3DSceneRenderer: (props: {
            readonly cameraPreset: TCodeCityCameraPreset
            readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
            readonly impactedFiles: ReadonlyArray<ICodeCity3DSceneImpactedFileDescriptor>
        }): React.JSX.Element => {
            return (
                <div>
                    renderer-files:{props.files.length};impacts:{props.impactedFiles.length};preset:
                    {props.cameraPreset}
                </div>
            )
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
const TEST_IMPACTED_FILES: ReadonlyArray<ICodeCity3DSceneImpactedFileDescriptor> = [
    {
        fileId: "src/api/repository.ts",
        impactType: "changed",
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
            expect(screen.getByText("renderer-files:1;impacts:0;preset:bird-eye")).not.toBeNull()
        })
        getContextSpy.mockRestore()
    })

    it("переключает camera preset между bird eye, street level и focus building", async (): Promise<void> => {
        const user = userEvent.setup()
        const fakeContext = {} as GPUCanvasContext
        const getContextSpy = vi
            .spyOn(HTMLCanvasElement.prototype, "getContext")
            .mockImplementation((): GPUCanvasContext => fakeContext)

        renderWithProviders(
            <CodeCity3DScene
                files={TEST_FILES}
                impactedFiles={TEST_IMPACTED_FILES}
                title="3D preset scene"
            />,
        )
        await waitFor((): void => {
            expect(screen.getByText("renderer-files:1;impacts:1;preset:bird-eye")).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Camera preset Street level" }))
        await waitFor((): void => {
            expect(screen.getByText("renderer-files:1;impacts:1;preset:street-level")).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Camera preset Focus building" }))
        await waitFor((): void => {
            expect(
                screen.getByText("renderer-files:1;impacts:1;preset:focus-on-building"),
            ).not.toBeNull()
        })

        getContextSpy.mockRestore()
    })
})
