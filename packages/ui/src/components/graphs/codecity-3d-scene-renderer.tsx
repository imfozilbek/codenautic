import { useMemo, type ReactElement } from "react"
import { OrbitControls } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"

import type { ICodeCity3DSceneFileDescriptor } from "./codecity-3d-scene"

interface ICodeCity3DSceneRendererProps {
    readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
}

interface ICodeCityBuildingMesh {
    readonly id: string
    readonly x: number
    readonly z: number
    readonly width: number
    readonly depth: number
    readonly height: number
    readonly color: string
}

const BASE_GRID_SPACING = 4

function toBuildingColor(coverage: number | undefined): string {
    if (coverage === undefined) {
        return "#facc15"
    }
    if (coverage >= 85) {
        return "#22c55e"
    }
    if (coverage >= 65) {
        return "#14b8a6"
    }
    if (coverage >= 45) {
        return "#fb923c"
    }
    return "#ef4444"
}

function createBuildingMeshes(
    files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>,
): ReadonlyArray<ICodeCityBuildingMesh> {
    const columns = Math.max(1, Math.ceil(Math.sqrt(files.length)))

    return files.map((file, index): ICodeCityBuildingMesh => {
        const rowIndex = Math.floor(index / columns)
        const columnIndex = index % columns
        const horizontalOffset = (columns - 1) / 2
        const fileComplexity = file.complexity ?? 0
        const fileLoc = file.loc ?? 0
        const x = (columnIndex - horizontalOffset) * BASE_GRID_SPACING
        const z = (rowIndex - horizontalOffset) * BASE_GRID_SPACING
        const width = Math.max(1, Math.min(3.4, fileComplexity / 8))
        const depth = Math.max(1, Math.min(3.4, fileLoc / 100))
        const height = Math.max(1.2, fileLoc / 26 + fileComplexity / 7)

        return {
            color: toBuildingColor(file.coverage),
            depth,
            height,
            id: file.id,
            width,
            x,
            z,
        }
    })
}

/**
 * 3D renderer для CodeCity: базовая сцена + здания файлов.
 *
 * @param props Данные файлов для генерации города.
 * @returns Canvas с orbit/pan/zoom контролами.
 */
export function CodeCity3DSceneRenderer(props: ICodeCity3DSceneRendererProps): ReactElement {
    const buildings = useMemo(
        (): ReadonlyArray<ICodeCityBuildingMesh> => createBuildingMeshes(props.files),
        [props.files],
    )

    return (
        <Canvas camera={{ fov: 45, position: [24, 22, 26] }} dpr={[1, 1.5]} shadows={false}>
            <color args={["#020617"]} attach="background" />
            <ambientLight intensity={0.55} />
            <directionalLight intensity={0.9} position={[18, 30, 12]} />
            <gridHelper args={[100, 80, "#334155", "#1e293b"]} />
            {buildings.map((building): ReactElement => (
                <mesh
                    key={building.id}
                    position={[building.x, building.height / 2, building.z]}
                >
                    <boxGeometry args={[building.width, building.height, building.depth]} />
                    <meshStandardMaterial color={building.color} metalness={0.1} roughness={0.6} />
                </mesh>
            ))}
            <OrbitControls
                enablePan={true}
                enableRotate={true}
                enableZoom={true}
                makeDefault={true}
            />
        </Canvas>
    )
}
