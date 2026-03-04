import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    CodeCity3DScene,
    type ICodeCity3DCausalCouplingDescriptor,
    type TCodeCityCameraPreset,
    type ICodeCity3DSceneImpactedFileDescriptor,
    type ICodeCity3DSceneFileDescriptor,
} from "@/components/graphs/codecity-3d-scene"
import { renderWithProviders } from "../utils/render"

vi.mock("@/components/graphs/codecity-3d-scene-renderer", () => {
    return {
        CodeCity3DSceneRenderer: (props: {
            readonly cameraPreset: TCodeCityCameraPreset
            readonly causalCouplings: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor>
            readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
            readonly impactedFiles: ReadonlyArray<ICodeCity3DSceneImpactedFileDescriptor>
            readonly selectedFileId?: string
            readonly onBuildingHover?: (fileId: string | undefined) => void
            readonly onBuildingSelect?: (fileId: string | undefined) => void
        }): React.JSX.Element => {
            return (
                <div>
                    renderer-files:{props.files.length};impacts:{props.impactedFiles.length};couplings:
                    {props.causalCouplings.length};preset:
                    {props.cameraPreset}
                    ;selected:{props.selectedFileId ?? "none"}
                    <button
                        onClick={(): void => {
                            props.onBuildingHover?.(props.files[0]?.id)
                        }}
                        type="button"
                    >
                        mock hover building
                    </button>
                    <button
                        onClick={(): void => {
                            props.onBuildingSelect?.(props.files[0]?.id)
                        }}
                        type="button"
                    >
                        mock select building
                    </button>
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
const TEST_TIMELINE_FILES: ReadonlyArray<ICodeCity3DSceneFileDescriptor> = [
    {
        complexity: 24,
        coverage: 82,
        id: "src/api/repository.ts",
        loc: 126,
        path: "src/api/repository.ts",
    },
    {
        complexity: 12,
        coverage: 76,
        id: "src/api/router.ts",
        loc: 98,
        path: "src/api/router.ts",
    },
    {
        complexity: 17,
        coverage: 71,
        id: "src/services/metrics.ts",
        loc: 144,
        path: "src/services/metrics.ts",
    },
    {
        complexity: 8,
        coverage: 88,
        id: "src/worker/index.ts",
        loc: 78,
        path: "src/worker/index.ts",
    },
]
const TEST_CAUSAL_COUPLINGS: ReadonlyArray<ICodeCity3DCausalCouplingDescriptor> = [
    {
        couplingType: "temporal",
        sourceFileId: "src/api/repository.ts",
        strength: 0.82,
        targetFileId: "src/api/router.ts",
    },
    {
        couplingType: "dependency",
        sourceFileId: "src/api/router.ts",
        strength: 0.55,
        targetFileId: "src/services/metrics.ts",
    },
]
const LARGE_GPU_BUDGET_FILES: ReadonlyArray<ICodeCity3DSceneFileDescriptor> = Array.from(
    { length: 720 },
    (_value, index): ICodeCity3DSceneFileDescriptor => {
        return {
            complexity: 12 + (index % 7),
            coverage: 70,
            id: `src/big/file-${String(index)}.ts`,
            loc: 100 + (index % 40),
            path: `src/big/file-${String(index)}.ts`,
        }
    },
)

function overrideNavigatorProperty(propertyName: string, value: unknown): () => void {
    const target = navigator as Navigator & Record<string, unknown>
    const previousDescriptor = Object.getOwnPropertyDescriptor(target, propertyName)
    Object.defineProperty(target, propertyName, {
        configurable: true,
        value,
    })

    return (): void => {
        if (previousDescriptor !== undefined) {
            Object.defineProperty(target, propertyName, previousDescriptor)
            return
        }
        delete target[propertyName]
    }
}

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
            expect(
                screen.getByText("renderer-files:1;impacts:0;couplings:0;preset:bird-eye;selected:none"),
            ).not.toBeNull()
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
                causalCouplings={TEST_CAUSAL_COUPLINGS}
                files={TEST_FILES}
                impactedFiles={TEST_IMPACTED_FILES}
                title="3D preset scene"
            />,
        )
        await waitFor((): void => {
            expect(
                screen.getByText("renderer-files:1;impacts:1;couplings:2;preset:bird-eye;selected:none"),
            ).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Camera preset Street level" }))
        await waitFor((): void => {
            expect(
                screen.getByText(
                    "renderer-files:1;impacts:1;couplings:2;preset:street-level;selected:none",
                ),
            ).not.toBeNull()
        })

        await user.click(screen.getByRole("button", { name: "Camera preset Focus building" }))
        await waitFor((): void => {
            expect(
                screen.getByText(
                    "renderer-files:1;impacts:1;couplings:2;preset:focus-on-building;selected:none",
                ),
            ).not.toBeNull()
        })

        getContextSpy.mockRestore()
    })

    it("показывает tooltip при hover и side panel при клике по зданию", async (): Promise<void> => {
        const user = userEvent.setup()
        const fakeContext = {} as GPUCanvasContext
        const getContextSpy = vi
            .spyOn(HTMLCanvasElement.prototype, "getContext")
            .mockImplementation((): GPUCanvasContext => fakeContext)

        renderWithProviders(
            <CodeCity3DScene
                causalCouplings={TEST_CAUSAL_COUPLINGS}
                files={TEST_FILES}
                impactedFiles={TEST_IMPACTED_FILES}
                title="3D interaction scene"
            />,
        )

        await user.click(screen.getByRole("button", { name: "mock hover building" }))
        expect(screen.getByText("Hover preview")).not.toBeNull()
        expect(screen.getByText("src/api/repository.ts")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "mock select building" }))
        expect(screen.getByText("File details")).not.toBeNull()
        expect(screen.getByText("Coverage")).not.toBeNull()

        getContextSpy.mockRestore()
    })

    it("поддерживает time-lapse play/pause и scrub по pre-computed snapshots", async (): Promise<void> => {
        const user = userEvent.setup()
        const fakeContext = {} as GPUCanvasContext
        const getContextSpy = vi
            .spyOn(HTMLCanvasElement.prototype, "getContext")
            .mockImplementation((): GPUCanvasContext => fakeContext)

        renderWithProviders(<CodeCity3DScene files={TEST_TIMELINE_FILES} title="3D timeline scene" />)

        expect(screen.getByText("City time-lapse")).not.toBeNull()
        expect(screen.getByText("Commit #1")).not.toBeNull()
        expect(screen.getByRole("button", { name: "Play timeline" })).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Play timeline" }))
        expect(screen.getByRole("button", { name: "Pause timeline" })).not.toBeNull()
        await user.click(screen.getByRole("button", { name: "Pause timeline" }))
        expect(screen.getByRole("button", { name: "Play timeline" })).not.toBeNull()

        const slider = screen.getByRole("slider", { name: "CodeCity timeline" })
        fireEvent.change(slider, { target: { value: "4" } })
        expect(screen.getByText("Commit #5")).not.toBeNull()
        expect(screen.getByText("Files: 4 / 4")).not.toBeNull()

        getContextSpy.mockRestore()
    })

    it("переключается в 2D fallback на слабом устройстве даже при доступном WebGL", (): void => {
        const fakeContext = {
            MAX_TEXTURE_SIZE: 1,
            getParameter: (): number => 1024,
        } as unknown as GPUCanvasContext
        const restoreCores = overrideNavigatorProperty("hardwareConcurrency", 2)
        const restoreMemory = overrideNavigatorProperty("deviceMemory", 2)
        const getContextSpy = vi
            .spyOn(HTMLCanvasElement.prototype, "getContext")
            .mockImplementation((): GPUCanvasContext => fakeContext)

        renderWithProviders(<CodeCity3DScene files={TEST_FILES} title="weak device fallback scene" />)
        expect(screen.getByRole("status")).toHaveTextContent("Weak GPU/CPU profile detected")
        expect(screen.getByText("2D treemap fallback")).not.toBeNull()

        getContextSpy.mockRestore()
        restoreCores()
        restoreMemory()
    })

    it("переключается в 2D fallback при превышении GPU budget", (): void => {
        const fakeContext = {
            MAX_TEXTURE_SIZE: 1,
            getParameter: (): number => 8192,
        } as unknown as GPUCanvasContext
        const restoreCores = overrideNavigatorProperty("hardwareConcurrency", 12)
        const restoreMemory = overrideNavigatorProperty("deviceMemory", 16)
        const getContextSpy = vi
            .spyOn(HTMLCanvasElement.prototype, "getContext")
            .mockImplementation((): GPUCanvasContext => fakeContext)

        renderWithProviders(
            <CodeCity3DScene files={LARGE_GPU_BUDGET_FILES} title="gpu budget fallback scene" />,
        )
        expect(screen.getByRole("status")).toHaveTextContent("GPU memory budget exceeded")
        expect(screen.getByText("2D treemap fallback")).not.toBeNull()

        getContextSpy.mockRestore()
        restoreCores()
        restoreMemory()
    })
})
