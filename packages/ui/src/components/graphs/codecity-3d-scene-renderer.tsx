import { useMemo, useRef, type ReactElement } from "react"
import { OrbitControls, Text } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Mesh, MeshStandardMaterial, Vector3 } from "three"

import type {
    ICodeCity3DSceneImpactedFileDescriptor,
    ICodeCity3DSceneFileDescriptor,
    TCodeCityCameraPreset,
    TCodeCityImpactType,
} from "./codecity-3d-scene"

interface ICodeCity3DSceneRendererProps {
    readonly cameraPreset: TCodeCityCameraPreset
    readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
    readonly impactedFiles: ReadonlyArray<ICodeCity3DSceneImpactedFileDescriptor>
}

/**
 * Подготовленная геометрия здания в 3D CodeCity.
 */
export interface ICodeCityBuildingMesh {
    readonly districtId: string
    readonly id: string
    readonly x: number
    readonly z: number
    readonly width: number
    readonly depth: number
    readonly height: number
    readonly color: string
}

/**
 * Геометрия района (district) в 3D CodeCity.
 */
export interface ICodeCityDistrictMesh {
    readonly id: string
    readonly label: string
    readonly x: number
    readonly z: number
    readonly width: number
    readonly depth: number
}

interface ICodeCityTreemapRect {
    readonly x: number
    readonly z: number
    readonly width: number
    readonly depth: number
}

interface ICodeCityDistrictItem {
    readonly id: string
    readonly label: string
    readonly weight: number
    readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
}

interface ICodeCityDistrictLayout extends ICodeCityDistrictMesh {
    readonly area: number
    readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
}

interface IOrbitControlsLike {
    readonly target: Vector3
    update: () => void
}

const MIN_BUILDING_WIDTH = 1
const MAX_BUILDING_WIDTH = 3.4
const MIN_RENDERABLE_BUILDING_WIDTH = 0.6
const MIN_RENDERABLE_BUILDING_DEPTH = 0.6
const MIN_BUILDING_HEIGHT = 1.2
const COMPLEXITY_TO_WIDTH_RATIO = 8
const LOC_TO_HEIGHT_RATIO = 24
const DISTRICT_PADDING = 1.1
const BUILDING_FILL_RATIO = 0.72
const MIN_DISTRICT_SPAN = 24
const CAMERA_LERP_FACTOR = 0.12
const IMPACT_NEIGHBOR_COUNT = 2

type TVec3 = readonly [number, number, number]
type TCodeCityBuildingImpactState = TCodeCityImpactType | "none"

interface ICameraPresetTarget {
    readonly position: TVec3
    readonly focus: TVec3
}

interface ICodeCityBuildingImpactProfile {
    readonly emissive: string
    readonly baseIntensity: number
    readonly pulseAmplitude: number
    readonly pulseSpeed: number
    readonly rippleLift: number
}

const BASE_CAMERA_PRESETS: Readonly<Record<TCodeCityCameraPreset, ICameraPresetTarget>> = {
    "bird-eye": {
        focus: [0, 0, 0],
        position: [30, 26, 30],
    },
    "focus-on-building": {
        focus: [0, 0, 0],
        position: [24, 20, 22],
    },
    "street-level": {
        focus: [0, 2, 0],
        position: [10, 7, 15],
    },
}

/**
 * Преобразует coverage файла в цвет здания.
 *
 * @param coverage Покрытие файла тестами в процентах.
 * @returns Hex-цвет для материала здания.
 */
export function resolveCodeCityBuildingColor(coverage: number | undefined): string {
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

/**
 * Выделяет label района из пути файла.
 *
 * @param path Путь файла.
 * @returns Label района.
 */
function resolveDistrictLabel(path: string): string {
    const segments = path
        .split("/")
        .map((segment): string => segment.trim())
        .filter((segment): boolean => segment.length > 0)

    const firstSegment = segments.at(0)
    if (firstSegment === undefined) {
        return "root"
    }

    if (firstSegment === "src") {
        return segments.at(1) ?? "src"
    }

    return firstSegment
}

/**
 * Группирует файлы по районам и назначает вес района.
 *
 * @param files Набор файлов CodeCity.
 * @returns Районы с файлами и весами.
 */
function createDistrictItems(
    files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>,
): ReadonlyArray<ICodeCityDistrictItem> {
    const filesByDistrict = new Map<string, Array<ICodeCity3DSceneFileDescriptor>>()

    for (const file of files) {
        const districtLabel = resolveDistrictLabel(file.path)
        const districtFiles = filesByDistrict.get(districtLabel)
        if (districtFiles !== undefined) {
            districtFiles.push(file)
            continue
        }
        filesByDistrict.set(districtLabel, [file])
    }

    return Array.from(filesByDistrict.entries())
        .sort((firstDistrict, secondDistrict): number => {
            return firstDistrict[0].localeCompare(secondDistrict[0])
        })
        .map(([label, districtFiles]): ICodeCityDistrictItem => {
            const weight = districtFiles.reduce((totalWeight, file): number => {
                return totalWeight + Math.max(1, file.loc ?? 0)
            }, 0)

            return {
                files: districtFiles,
                id: label,
                label,
                weight,
            }
        })
}

/**
 * Оценивает worst aspect ratio для ряда squarified layout.
 *
 * @param areas Площади элементов ряда.
 * @param shortSide Короткая сторона текущего контейнера.
 * @returns Максимальное отклонение aspect ratio.
 */
function calculateWorstAspect(areas: ReadonlyArray<number>, shortSide: number): number {
    if (areas.length === 0) {
        return Number.POSITIVE_INFINITY
    }

    const totalArea = areas.reduce((total, currentArea): number => total + currentArea, 0)
    const maxArea = Math.max(...areas)
    const minArea = Math.min(...areas)
    const sideSquared = shortSide * shortSide
    const worstLeft = (sideSquared * maxArea) / (totalArea * totalArea)
    const worstRight = (totalArea * totalArea) / (sideSquared * Math.max(minArea, 1e-6))
    return Math.max(worstLeft, worstRight)
}

/**
 * Раскладывает ряд районов в текущий контейнер.
 *
 * @param row Районы текущего ряда.
 * @param container Текущий контейнер.
 * @param horizontal Ориентация ряда.
 * @returns Размещённый ряд и остаток контейнера.
 */
function layoutDistrictRow(
    row: ReadonlyArray<ICodeCityDistrictLayout>,
    container: ICodeCityTreemapRect,
    horizontal: boolean,
): {
    readonly placed: ReadonlyArray<ICodeCityDistrictLayout>
    readonly remaining: ICodeCityTreemapRect
} {
    const rowArea = row.reduce((totalArea, district): number => totalArea + district.area, 0)

    if (horizontal) {
        const rowDepth = rowArea / Math.max(container.width, 1e-6)
        let xCursor = container.x

        const placed = row.map((district): ICodeCityDistrictLayout => {
            const width = district.area / Math.max(rowDepth, 1e-6)
            const x = xCursor + width / 2
            xCursor += width

            return {
                ...district,
                depth: rowDepth,
                width,
                x,
                z: container.z + rowDepth / 2,
            }
        })

        return {
            placed,
            remaining: {
                depth: Math.max(0, container.depth - rowDepth),
                width: container.width,
                x: container.x,
                z: container.z + rowDepth,
            },
        }
    }

    const rowWidth = rowArea / Math.max(container.depth, 1e-6)
    let zCursor = container.z
    const placed = row.map((district): ICodeCityDistrictLayout => {
        const depth = district.area / Math.max(rowWidth, 1e-6)
        const z = zCursor + depth / 2
        zCursor += depth

        return {
            ...district,
            depth,
            width: rowWidth,
            x: container.x + rowWidth / 2,
            z,
        }
    })

    return {
        placed,
        remaining: {
            depth: container.depth,
            width: Math.max(0, container.width - rowWidth),
            x: container.x + rowWidth,
            z: container.z,
        },
    }
}

/**
 * Строит squarified treemap layout районов и центрирует его относительно (0,0).
 *
 * @param districts Районы с весами.
 * @returns Layout районов.
 */
function createDistrictLayouts(
    districts: ReadonlyArray<ICodeCityDistrictItem>,
): ReadonlyArray<ICodeCityDistrictLayout> {
    if (districts.length === 0) {
        return []
    }

    const totalWeight = districts.reduce((total, district): number => total + district.weight, 0)
    const span = Math.max(MIN_DISTRICT_SPAN, Math.sqrt(totalWeight))
    const canvasArea = span * span

    const queue = districts
        .map((district): ICodeCityDistrictLayout => {
            return {
                area: (district.weight / totalWeight) * canvasArea,
                depth: 0,
                files: district.files,
                id: district.id,
                label: district.label,
                width: 0,
                x: 0,
                z: 0,
            }
        })
        .sort((leftDistrict, rightDistrict): number => rightDistrict.area - leftDistrict.area)

    let container: ICodeCityTreemapRect = { depth: span, width: span, x: 0, z: 0 }
    let row: Array<ICodeCityDistrictLayout> = []
    const placed: Array<ICodeCityDistrictLayout> = []

    for (const district of queue) {
        const nextRow = [...row, district]
        const shortSide = Math.max(1e-6, Math.min(container.width, container.depth))
        const currentWorst = calculateWorstAspect(
            row.map((rowDistrict): number => rowDistrict.area),
            shortSide,
        )
        const nextWorst = calculateWorstAspect(
            nextRow.map((rowDistrict): number => rowDistrict.area),
            shortSide,
        )

        if (row.length === 0 || nextWorst <= currentWorst) {
            row = nextRow
            continue
        }

        const rowLayout = layoutDistrictRow(row, container, container.width >= container.depth)
        placed.push(...rowLayout.placed)
        container = rowLayout.remaining
        row = [district]
    }

    if (row.length > 0) {
        const rowLayout = layoutDistrictRow(row, container, container.width >= container.depth)
        placed.push(...rowLayout.placed)
    }

    const centerOffset = span / 2
    return placed.map((district): ICodeCityDistrictLayout => {
        return {
            ...district,
            x: district.x - centerOffset,
            z: district.z - centerOffset,
        }
    })
}

/**
 * Генерирует районы CodeCity на основе paths файлов.
 *
 * @param files Набор файлов CodeCity.
 * @returns Меши районов с squarified layout.
 */
export function createCodeCityDistrictMeshes(
    files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>,
): ReadonlyArray<ICodeCityDistrictMesh> {
    const districtLayouts = createDistrictLayouts(createDistrictItems(files))

    return districtLayouts.map((district): ICodeCityDistrictMesh => {
        return {
            depth: district.depth,
            id: district.id,
            label: district.label,
            width: district.width,
            x: district.x,
            z: district.z,
        }
    })
}

/**
 * Генерирует 3D-здания по файлам репозитория.
 *
 * @param files Набор файлов CodeCity.
 * @returns Нормализованные меши зданий.
 */
export function createCodeCityBuildingMeshes(
    files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>,
): ReadonlyArray<ICodeCityBuildingMesh> {
    const districtLayouts = createDistrictLayouts(createDistrictItems(files))

    return districtLayouts.flatMap((district): ReadonlyArray<ICodeCityBuildingMesh> => {
        const districtFiles = district.files
        const columns = Math.max(1, Math.ceil(Math.sqrt(districtFiles.length)))
        const rows = Math.max(1, Math.ceil(districtFiles.length / columns))
        const usableWidth = Math.max(2, district.width - DISTRICT_PADDING * 2)
        const usableDepth = Math.max(2, district.depth - DISTRICT_PADDING * 2)
        const cellWidth = usableWidth / columns
        const cellDepth = usableDepth / rows
        const districtLeft = district.x - district.width / 2 + DISTRICT_PADDING
        const districtTop = district.z - district.depth / 2 + DISTRICT_PADDING

        return districtFiles.map((file, index): ICodeCityBuildingMesh => {
            const rowIndex = Math.floor(index / columns)
            const columnIndex = index % columns
            const fileComplexity = file.complexity ?? 0
            const fileLoc = file.loc ?? 0
            const widthByComplexity = Math.max(
                MIN_BUILDING_WIDTH,
                Math.min(MAX_BUILDING_WIDTH, fileComplexity / COMPLEXITY_TO_WIDTH_RATIO),
            )
            const maxCellWidth = cellWidth * BUILDING_FILL_RATIO
            const maxCellDepth = cellDepth * BUILDING_FILL_RATIO
            const width = Math.max(
                MIN_RENDERABLE_BUILDING_WIDTH,
                Math.min(widthByComplexity, maxCellWidth),
            )
            const depth = Math.max(MIN_RENDERABLE_BUILDING_DEPTH, maxCellDepth)
            const height = Math.max(MIN_BUILDING_HEIGHT, fileLoc / LOC_TO_HEIGHT_RATIO)
            const x = districtLeft + cellWidth * (columnIndex + 0.5)
            const z = districtTop + cellDepth * (rowIndex + 0.5)

            return {
                color: resolveCodeCityBuildingColor(file.coverage),
                depth,
                districtId: district.id,
                height,
                id: file.id,
                width,
                x,
                z,
            }
        })
    })
}

/**
 * Строит карту impact-состояний зданий: прямой impact + ripple на соседей.
 *
 * @param buildings Сгенерированные здания CodeCity.
 * @param impactedFiles Явные impact-файлы из CCR контекста.
 * @returns Карта fileId -> impact type.
 */
export function createCodeCityBuildingImpactMap(
    buildings: ReadonlyArray<ICodeCityBuildingMesh>,
    impactedFiles: ReadonlyArray<ICodeCity3DSceneImpactedFileDescriptor>,
): ReadonlyMap<string, TCodeCityImpactType> {
    const impactByFileId = new Map<string, TCodeCityImpactType>()
    for (const impactedFile of impactedFiles) {
        impactByFileId.set(impactedFile.fileId, impactedFile.impactType)
    }

    const candidateNeighborsByDistrict = new Map<string, Array<ICodeCityBuildingMesh>>()
    for (const building of buildings) {
        if (impactByFileId.has(building.id)) {
            continue
        }

        const districtNeighbors = candidateNeighborsByDistrict.get(building.districtId)
        if (districtNeighbors !== undefined) {
            districtNeighbors.push(building)
            continue
        }
        candidateNeighborsByDistrict.set(building.districtId, [building])
    }

    const impactOrigins = buildings.filter((building): boolean => {
        const impactType = impactByFileId.get(building.id)
        return impactType === "changed" || impactType === "impacted"
    })

    for (const origin of impactOrigins) {
        const districtNeighbors = candidateNeighborsByDistrict.get(origin.districtId) ?? []
        const nearestNeighbors = districtNeighbors
            .map((candidate): { readonly building: ICodeCityBuildingMesh; readonly distance: number } => {
                return {
                    building: candidate,
                    distance: Math.hypot(candidate.x - origin.x, candidate.z - origin.z),
                }
            })
            .sort((leftCandidate, rightCandidate): number => {
                return leftCandidate.distance - rightCandidate.distance
            })
            .slice(0, IMPACT_NEIGHBOR_COUNT)

        for (const neighbor of nearestNeighbors) {
            if (impactByFileId.has(neighbor.building.id)) {
                continue
            }
            impactByFileId.set(neighbor.building.id, "ripple")
        }
    }

    return impactByFileId
}

/**
 * Возвращает visual-профиль здания по impact-состоянию.
 *
 * @param impactState Текущее состояние impact-подсветки.
 * @returns Параметры emissive/pulse/ripple анимации.
 */
export function resolveCodeCityBuildingImpactProfile(
    impactState: TCodeCityBuildingImpactState,
): ICodeCityBuildingImpactProfile {
    if (impactState === "changed") {
        return {
            baseIntensity: 0.3,
            emissive: "#fb7185",
            pulseAmplitude: 0.52,
            pulseSpeed: 3.8,
            rippleLift: 0,
        }
    }

    if (impactState === "impacted") {
        return {
            baseIntensity: 0.25,
            emissive: "#22d3ee",
            pulseAmplitude: 0.38,
            pulseSpeed: 3.1,
            rippleLift: 0,
        }
    }

    if (impactState === "ripple") {
        return {
            baseIntensity: 0.12,
            emissive: "#38bdf8",
            pulseAmplitude: 0.22,
            pulseSpeed: 2.4,
            rippleLift: 0.16,
        }
    }

    return {
        baseIntensity: 0,
        emissive: "#0f172a",
        pulseAmplitude: 0,
        pulseSpeed: 0,
        rippleLift: 0,
    }
}

/**
 * Рассчитывает целевое положение камеры для выбранного пресета.
 *
 * @param preset Выбранный пресет камеры.
 * @param focusBuilding Опорное здание для focus-режима.
 * @returns Целевые координаты камеры и фокуса.
 */
function resolveCameraPresetTarget(
    preset: TCodeCityCameraPreset,
    focusBuilding: ICodeCityBuildingMesh | undefined,
): ICameraPresetTarget {
    if (preset !== "focus-on-building" || focusBuilding === undefined) {
        return BASE_CAMERA_PRESETS[preset]
    }

    return {
        focus: [
            focusBuilding.x,
            Math.max(1.5, focusBuilding.height / 2),
            focusBuilding.z,
        ] as const,
        position: [
            focusBuilding.x + 8,
            Math.max(7, focusBuilding.height + 4),
            focusBuilding.z + 8,
        ] as const,
    }
}

interface ICameraPresetControllerProps {
    readonly controlsRef: { current: IOrbitControlsLike | null }
    readonly target: ICameraPresetTarget
}

/**
 * Плавно анимирует камеру и target OrbitControls к выбранному пресету.
 *
 * @param props Целевые координаты и ref controls.
 * @returns null (служебный scene-controller).
 */
function CameraPresetController(props: ICameraPresetControllerProps): null {
    const { camera } = useThree()
    const targetPosition = useMemo((): Vector3 => new Vector3(...props.target.position), [props.target])
    const targetFocus = useMemo((): Vector3 => new Vector3(...props.target.focus), [props.target])

    useFrame((): void => {
        camera.position.lerp(targetPosition, CAMERA_LERP_FACTOR)
        const controls = props.controlsRef.current
        if (controls !== null) {
            controls.target.lerp(targetFocus, CAMERA_LERP_FACTOR)
            controls.update()
            return
        }
        camera.lookAt(targetFocus)
    })

    return null
}

interface IImpactBuildingMeshProps {
    readonly building: ICodeCityBuildingMesh
    readonly impactState: TCodeCityBuildingImpactState
    readonly phaseSeed: number
}

/**
 * Рендерит здание CodeCity с impact-анимацией glow/pulse/ripple.
 *
 * @param props Конфигурация здания и impact-состояния.
 * @returns Меш здания.
 */
function ImpactBuildingMesh(props: IImpactBuildingMeshProps): ReactElement {
    const meshRef = useRef<Mesh | null>(null)
    const materialRef = useRef<MeshStandardMaterial | null>(null)
    const impactProfile = useMemo(
        (): ICodeCityBuildingImpactProfile => {
            return resolveCodeCityBuildingImpactProfile(props.impactState)
        },
        [props.impactState],
    )
    const baseY = props.building.height / 2

    useFrame((state): void => {
        const animationPhase = state.clock.getElapsedTime() * impactProfile.pulseSpeed + props.phaseSeed
        const material = materialRef.current
        if (material !== null) {
            const pulseOffset =
                impactProfile.pulseAmplitude > 0
                    ? Math.sin(animationPhase) * impactProfile.pulseAmplitude
                    : 0
            material.emissiveIntensity = Math.max(0, impactProfile.baseIntensity + pulseOffset)
        }

        const mesh = meshRef.current
        if (mesh === null) {
            return
        }

        if (impactProfile.rippleLift <= 0) {
            mesh.position.y = baseY
            return
        }

        const rippleWave = Math.sin(animationPhase) * impactProfile.rippleLift
        mesh.position.y = baseY + Math.max(0, rippleWave)
    })

    return (
        <mesh key={props.building.id} position={[props.building.x, baseY, props.building.z]} ref={meshRef}>
            <boxGeometry args={[props.building.width, props.building.height, props.building.depth]} />
            <meshStandardMaterial
                color={props.building.color}
                emissive={impactProfile.emissive}
                emissiveIntensity={impactProfile.baseIntensity}
                metalness={0.1}
                ref={materialRef}
                roughness={0.6}
            />
        </mesh>
    )
}

/**
 * 3D renderer для CodeCity: базовая сцена + здания файлов.
 *
 * @param props Данные файлов для генерации города.
 * @returns Canvas с orbit/pan/zoom контролами.
 */
export function CodeCity3DSceneRenderer(props: ICodeCity3DSceneRendererProps): ReactElement {
    const controlsRef = useRef<IOrbitControlsLike | null>(null)
    const districts = useMemo(
        (): ReadonlyArray<ICodeCityDistrictMesh> => createCodeCityDistrictMeshes(props.files),
        [props.files],
    )
    const buildings = useMemo(
        (): ReadonlyArray<ICodeCityBuildingMesh> => createCodeCityBuildingMeshes(props.files),
        [props.files],
    )
    const impactMap = useMemo((): ReadonlyMap<string, TCodeCityImpactType> => {
        return createCodeCityBuildingImpactMap(buildings, props.impactedFiles)
    }, [buildings, props.impactedFiles])
    const cameraPresetTarget = useMemo((): ICameraPresetTarget => {
        return resolveCameraPresetTarget(props.cameraPreset, buildings.at(0))
    }, [buildings, props.cameraPreset])

    return (
        <Canvas camera={{ fov: 45, position: [30, 26, 30] }} dpr={[1, 1.5]} shadows={false}>
            <CameraPresetController controlsRef={controlsRef} target={cameraPresetTarget} />
            <color args={["#020617"]} attach="background" />
            <ambientLight intensity={0.55} />
            <directionalLight intensity={0.9} position={[18, 30, 12]} />
            <gridHelper args={[100, 80, "#334155", "#1e293b"]} />
            {districts.map((district): ReactElement => (
                <group key={`district-${district.id}`}>
                    <mesh position={[district.x, -0.03, district.z]}>
                        <boxGeometry args={[district.width, 0.06, district.depth]} />
                        <meshStandardMaterial color="#0f172a" metalness={0.02} roughness={0.92} />
                    </mesh>
                    <Text
                        anchorX="center"
                        anchorY="middle"
                        color="#94a3b8"
                        fontSize={Math.max(0.38, Math.min(0.95, district.width / 6))}
                        position={[district.x, 0.04, district.z]}
                        rotation={[-Math.PI / 2, 0, 0]}
                    >
                        {district.label}
                    </Text>
                </group>
            ))}
            {buildings.map((building, index): ReactElement => (
                <ImpactBuildingMesh
                    building={building}
                    impactState={impactMap.get(building.id) ?? "none"}
                    key={building.id}
                    phaseSeed={index * 0.45}
                />
            ))}
            <OrbitControls
                enablePan={true}
                enableRotate={true}
                enableZoom={true}
                makeDefault={true}
                ref={(controls): void => {
                    controlsRef.current = controls as unknown as IOrbitControlsLike | null
                }}
            />
        </Canvas>
    )
}
