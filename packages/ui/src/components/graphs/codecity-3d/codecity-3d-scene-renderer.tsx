import { useEffect, useMemo, useRef, useState, type ReactElement } from "react"
import { Line, OrbitControls, Text } from "@react-three/drei"
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber"
import {
    Color,
    InstancedMesh,
    Matrix4,
    MeshBasicMaterial,
    Mesh,
    MeshStandardMaterial,
    Object3D,
    Vector3,
} from "three"

import {
    SCENE_BACKGROUND,
    SCENE_BREADCRUMB_EMISSIVE,
    SCENE_BREADCRUMB_SPHERE,
    SCENE_DISTRICT_FLOOR,
    SCENE_DISTRICT_LABEL,
    SCENE_GRID_DIVISION,
    SCENE_GRID_LINE,
    SCENE_NAVIGATION_TRAIL,
} from "@/lib/constants/codecity-colors"

import type { TCodeCityImpactType } from "../codecity-3d-scene"

import {
    createCodeCityCausalArcs,
    createCodeCityNavigationTrail,
    interpolateQuadraticBezierPoint,
    sampleQuadraticBezierPath,
} from "./codecity-arc-builders"
import { resolveCodeCityRenderBudget } from "./codecity-render-budget"
import {
    BASE_CAMERA_PRESETS,
    CAMERA_LERP_FACTOR,
    MAX_BUG_EMISSION_CLOUDS,
    MAX_CAUSAL_ARCS_HIGH_QUALITY,
    MAX_CAUSAL_ARCS_LOW_QUALITY,
    PERFORMANCE_SAMPLE_WINDOW_SECONDS,
} from "./codecity-scene-constants"
import type {
    IBugEmissionSettings,
    ICameraPresetTarget,
    ICodeCity3DSceneRendererProps,
    ICodeCityBuildingImpactProfile,
    ICodeCityBuildingMesh,
    ICodeCityCausalArc,
    ICodeCityDistrictHealthAura,
    ICodeCityDistrictMesh,
    ICodeCityLayoutWorkerResponse,
    ICodeCityRenderBudget,
    IOrbitControlsLike,
    TCodeCityBuildingImpactState,
    TVec3,
} from "./codecity-scene-types"
import {
    createCodeCityBuildingImpactMap,
    createCodeCityBuildingMeshes,
    createCodeCityDistrictMeshes,
} from "./codecity-treemap-layout"
import {
    createCodeCityDistrictHealthAuras,
    resolveCodeCityBugEmissionSettings,
    resolveCodeCityBuildingImpactProfile,
} from "./codecity-visual-resolvers"

/**
 * Создаёт layout worker для расчёта геометрии CodeCity в фоне.
 *
 * @returns Экземпляр Worker или `undefined`, если инициализация недоступна.
 */
export function createCodeCityLayoutWorker(): Worker | undefined {
    if (typeof Worker === "undefined") {
        return undefined
    }

    try {
        return new Worker(new URL("../codecity-3d-layout.worker.ts", import.meta.url), {
            type: "module",
        })
    } catch {
        return undefined
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
    preset: ICodeCity3DSceneRendererProps["cameraPreset"],
    focusBuilding: ICodeCityBuildingMesh | undefined,
): ICameraPresetTarget {
    if (preset !== "focus-on-building" || focusBuilding === undefined) {
        return BASE_CAMERA_PRESETS[preset]
    }

    return {
        focus: [focusBuilding.x, Math.max(1.5, focusBuilding.height / 2), focusBuilding.z] as const,
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
    const targetPosition = useMemo(
        (): Vector3 => new Vector3(...props.target.position),
        [props.target],
    )
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

interface IRenderPerformanceControllerProps {
    readonly onSample: (fps: number) => void
}

/**
 * Сэмплирует FPS и сообщает его в renderer для адаптивной деградации качества.
 *
 * @param props Callback получения текущего FPS.
 * @returns null (служебный controller).
 */
function RenderPerformanceController(props: IRenderPerformanceControllerProps): null {
    const frameCountRef = useRef<number>(0)
    const elapsedRef = useRef<number>(0)

    useFrame((_, delta): void => {
        frameCountRef.current += 1
        elapsedRef.current += delta
        if (elapsedRef.current < PERFORMANCE_SAMPLE_WINDOW_SECONDS) {
            return
        }

        const fps = frameCountRef.current / Math.max(elapsedRef.current, 1e-6)
        props.onSample(fps)
        frameCountRef.current = 0
        elapsedRef.current = 0
    })

    return null
}

interface IInstancedBuildingsMeshProps {
    readonly buildings: ReadonlyArray<ICodeCityBuildingMesh>
}

interface ICausalArcMeshProps {
    readonly arc: ICodeCityCausalArc
    readonly phaseSeed: number
}

/**
 * Рендерит причинно-следственную дугу с анимированным particle-flow.
 *
 * @param props Параметры дуги.
 * @returns Группа с линией и движущимся particle.
 */
function CausalArcMesh(props: ICausalArcMeshProps): ReactElement {
    const particleRef = useRef<Mesh | null>(null)
    const linePoints = useMemo((): ReadonlyArray<Vector3> => {
        return sampleQuadraticBezierPath(props.arc.start, props.arc.control, props.arc.end).map(
            (point): Vector3 => new Vector3(...point),
        )
    }, [props.arc.control, props.arc.end, props.arc.start])

    useFrame((state): void => {
        const flowPhase =
            (state.clock.getElapsedTime() * props.arc.particleSpeed + props.phaseSeed) % 1
        const point = interpolateQuadraticBezierPoint(
            props.arc.start,
            props.arc.control,
            props.arc.end,
            flowPhase,
        )
        const particle = particleRef.current
        if (particle === null) {
            return
        }
        particle.position.set(point[0], point[1], point[2])
    })

    return (
        <group>
            <Line
                color={props.arc.color}
                lineWidth={1 + props.arc.strength * 1.8}
                opacity={0.35 + props.arc.strength * 0.45}
                points={linePoints}
                transparent={true}
            />
            <mesh ref={particleRef}>
                <sphereGeometry args={[0.08 + props.arc.strength * 0.1, 8, 8]} />
                <meshStandardMaterial
                    color={props.arc.color}
                    emissive={props.arc.color}
                    emissiveIntensity={0.8}
                    toneMapped={false}
                />
            </mesh>
        </group>
    )
}

/**
 * Рендерит неинтерактивный хвост зданий через instanced mesh для экономии draw calls.
 *
 * @param props Набор зданий для пакетного рендера.
 * @returns Instanced mesh контейнер.
 */
function InstancedBuildingsMesh(props: IInstancedBuildingsMeshProps): ReactElement | null {
    const meshRef = useRef<InstancedMesh | null>(null)
    const matrix = useMemo((): Matrix4 => new Matrix4(), [])
    const dummy = useMemo((): Object3D => new Object3D(), [])

    useEffect((): void => {
        const mesh = meshRef.current
        if (mesh === null) {
            return
        }

        for (let index = 0; index < props.buildings.length; index += 1) {
            const building = props.buildings[index]
            if (building === undefined) {
                continue
            }

            dummy.position.set(building.x, building.height / 2, building.z)
            dummy.scale.set(building.width, building.height, building.depth)
            dummy.updateMatrix()
            matrix.copy(dummy.matrix)
            mesh.setMatrixAt(index, matrix)
            mesh.setColorAt(index, new Color(building.color))
        }

        mesh.count = props.buildings.length
        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor !== null) {
            mesh.instanceColor.needsUpdate = true
        }
    }, [dummy, matrix, props.buildings])

    if (props.buildings.length === 0) {
        return null
    }

    return (
        <instancedMesh
            args={[undefined, undefined, props.buildings.length]}
            frustumCulled={true}
            ref={meshRef}
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial metalness={0.05} roughness={0.68} vertexColors={true} />
        </instancedMesh>
    )
}

interface IBugEmissionMeshProps {
    readonly building: ICodeCityBuildingMesh
    readonly settings: IBugEmissionSettings
}

/**
 * Рендерит эмиссию багов: поток частиц над зданием и pulse-ring при recent bugs.
 *
 * @param props Целевое здание и профиль эмиссии.
 * @returns Группа bug-emission эффектов.
 */
function BugEmissionMesh(props: IBugEmissionMeshProps): ReactElement {
    const particleRefs = useRef<Array<Mesh | null>>([])
    const pulseRef = useRef<Mesh | null>(null)
    const particleOffsets = useMemo((): ReadonlyArray<{
        readonly phaseSeed: number
        readonly radius: number
        readonly speed: number
    }> => {
        return Array.from({ length: props.settings.particleCount }, (_value, index) => {
            return {
                phaseSeed: index * 0.8,
                radius: 0.16 + (index % 3) * 0.07,
                speed: 1 + index * 0.12,
            }
        })
    }, [props.settings.particleCount])

    useFrame((state): void => {
        const elapsed = state.clock.getElapsedTime()
        const baseY = props.building.height + 0.14
        const verticalRange = 0.55 + props.settings.particleCount * 0.11

        particleOffsets.forEach((offset, index): void => {
            const particle = particleRefs.current[index]
            if (particle === null || particle === undefined) {
                return
            }

            const phase = elapsed * offset.speed + offset.phaseSeed
            const normalized = (Math.sin(phase) + 1) / 2
            const orbitX = Math.cos(phase) * offset.radius
            const orbitZ = Math.sin(phase) * offset.radius
            particle.position.set(
                props.building.x + orbitX,
                baseY + normalized * verticalRange,
                props.building.z + orbitZ,
            )
            const scale = 0.65 + normalized * 0.45
            particle.scale.set(scale, scale, scale)
        })

        if (props.building.recentBugCount <= 0) {
            return
        }

        const pulseMesh = pulseRef.current
        if (pulseMesh === null) {
            return
        }
        const pulse = (Math.sin(elapsed * 2.4) + 1) / 2
        const scale = 1 + pulse * props.settings.pulseStrength * 1.5
        pulseMesh.position.set(props.building.x, props.building.height + 0.06, props.building.z)
        pulseMesh.scale.set(scale, scale, scale)
    })

    return (
        <group>
            {particleOffsets.map(
                (offset, index): ReactElement => (
                    <mesh
                        key={`${props.building.id}-bug-particle-${String(index)}`}
                        ref={(mesh): void => {
                            particleRefs.current[index] = mesh
                        }}
                    >
                        <sphereGeometry args={[0.08, 8, 8]} />
                        <meshStandardMaterial
                            color={props.settings.color}
                            emissive={props.settings.color}
                            emissiveIntensity={0.85}
                            opacity={0.7}
                            toneMapped={false}
                            transparent={true}
                        />
                    </mesh>
                ),
            )}
            {props.building.recentBugCount > 0 ? (
                <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.28, 0.44, 24]} />
                    <meshBasicMaterial
                        color={props.settings.color}
                        opacity={0.28}
                        transparent={true}
                    />
                </mesh>
            ) : null}
        </group>
    )
}

interface IDistrictHealthAuraMeshProps {
    readonly aura: ICodeCityDistrictHealthAura
    readonly phaseSeed: number
}

/**
 * Рендерит district health aura: цвет по score и плавный pulse во времени.
 *
 * @param props Параметры aura района.
 * @returns Полупрозрачный glow-пласт.
 */
function DistrictHealthAuraMesh(props: IDistrictHealthAuraMeshProps): ReactElement {
    const meshRef = useRef<Mesh | null>(null)
    const materialRef = useRef<MeshBasicMaterial | null>(null)
    const baseOpacity = 0.1 + (100 - props.aura.healthScore) / 260

    useFrame((state): void => {
        const wave =
            (Math.sin(state.clock.getElapsedTime() * props.aura.pulseSpeed + props.phaseSeed) + 1) /
            2
        const mesh = meshRef.current
        if (mesh !== null) {
            const scale = 1 + wave * 0.14
            mesh.scale.set(scale, scale, 1)
        }

        const material = materialRef.current
        if (material !== null) {
            material.opacity = Math.min(0.4, baseOpacity + wave * 0.16)
        }
    })

    return (
        <mesh
            position={[props.aura.x, 0.03, props.aura.z]}
            ref={meshRef}
            rotation={[-Math.PI / 2, 0, 0]}
        >
            <planeGeometry args={[props.aura.width * 1.05, props.aura.depth * 1.05]} />
            <meshBasicMaterial
                color={props.aura.color}
                depthWrite={false}
                opacity={baseOpacity}
                ref={materialRef}
                transparent={true}
            />
        </mesh>
    )
}

interface IImpactBuildingMeshProps {
    readonly building: ICodeCityBuildingMesh
    readonly impactState: TCodeCityBuildingImpactState
    readonly phaseSeed: number
    readonly isSelected: boolean
    readonly onHover?: (fileId: string | undefined) => void
    readonly onSelect?: (fileId: string | undefined) => void
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
    const impactProfile = useMemo((): ICodeCityBuildingImpactProfile => {
        return resolveCodeCityBuildingImpactProfile(props.impactState)
    }, [props.impactState])
    const baseY = props.building.height / 2

    useFrame((state): void => {
        const animationPhase =
            state.clock.getElapsedTime() * impactProfile.pulseSpeed + props.phaseSeed
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
        <mesh
            key={props.building.id}
            onClick={(event: ThreeEvent<MouseEvent>): void => {
                event.stopPropagation()
                props.onSelect?.(props.building.id)
            }}
            onPointerOut={(event: ThreeEvent<PointerEvent>): void => {
                event.stopPropagation()
                props.onHover?.(undefined)
            }}
            onPointerOver={(event: ThreeEvent<PointerEvent>): void => {
                event.stopPropagation()
                props.onHover?.(props.building.id)
            }}
            position={[props.building.x, baseY, props.building.z]}
            ref={meshRef}
        >
            <boxGeometry
                args={[
                    props.isSelected ? props.building.width * 1.08 : props.building.width,
                    props.building.height,
                    props.isSelected ? props.building.depth * 1.08 : props.building.depth,
                ]}
            />
            <meshStandardMaterial
                color={props.building.color}
                emissive={impactProfile.emissive}
                emissiveIntensity={
                    props.isSelected
                        ? Math.max(impactProfile.baseIntensity, 0.55)
                        : impactProfile.baseIntensity
                }
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
    const [buildings, setBuildings] = useState<ReadonlyArray<ICodeCityBuildingMesh>>([])
    const [districts, setDistricts] = useState<ReadonlyArray<ICodeCityDistrictMesh>>([])
    const [sampledFps, setSampledFps] = useState<number | undefined>(undefined)

    useEffect((): (() => void) => {
        if (props.files.length === 0) {
            setBuildings([])
            setDistricts([])
            return (): void => {
                return
            }
        }

        const layoutWorker = createCodeCityLayoutWorker()
        if (layoutWorker === undefined) {
            setDistricts(createCodeCityDistrictMeshes(props.files))
            setBuildings(createCodeCityBuildingMeshes(props.files))
            return (): void => {
                return
            }
        }

        let disposed = false
        const handleMessage = (event: Event): void => {
            const messageEvent = event as MessageEvent<ICodeCityLayoutWorkerResponse>
            if (disposed || messageEvent.data.type !== "layout") {
                return
            }
            setBuildings(messageEvent.data.buildings)
            setDistricts(messageEvent.data.districts)
        }
        const handleError = (): void => {
            if (disposed) {
                return
            }
            setDistricts(createCodeCityDistrictMeshes(props.files))
            setBuildings(createCodeCityBuildingMeshes(props.files))
        }

        layoutWorker.addEventListener("message", handleMessage)
        layoutWorker.addEventListener("error", handleError)
        layoutWorker.postMessage({
            files: props.files,
        } satisfies {
            readonly files: ReadonlyArray<ICodeCity3DSceneRendererProps["files"][number]>
        })

        return (): void => {
            disposed = true
            layoutWorker.removeEventListener("message", handleMessage)
            layoutWorker.removeEventListener("error", handleError)
            layoutWorker.terminate()
        }
    }, [props.files])
    const impactMap = useMemo((): ReadonlyMap<string, TCodeCityImpactType> => {
        return createCodeCityBuildingImpactMap(buildings, props.impactedFiles)
    }, [buildings, props.impactedFiles])
    const renderBudget = useMemo((): ICodeCityRenderBudget => {
        return resolveCodeCityRenderBudget(buildings.length, sampledFps)
    }, [buildings.length, sampledFps])
    const causalArcs = useMemo((): ReadonlyArray<ICodeCityCausalArc> => {
        return createCodeCityCausalArcs(buildings, props.causalCouplings)
    }, [buildings, props.causalCouplings])
    const visibleCausalArcs = useMemo((): ReadonlyArray<ICodeCityCausalArc> => {
        const maxArcs =
            renderBudget.quality === "low"
                ? MAX_CAUSAL_ARCS_LOW_QUALITY
                : MAX_CAUSAL_ARCS_HIGH_QUALITY
        return causalArcs.slice(0, maxArcs)
    }, [causalArcs, renderBudget.quality])
    const districtHealthAuras = useMemo((): ReadonlyArray<ICodeCityDistrictHealthAura> => {
        return createCodeCityDistrictHealthAuras(districts, buildings)
    }, [buildings, districts])
    const navigationTrail = useMemo((): ReadonlyArray<TVec3> => {
        return createCodeCityNavigationTrail(buildings, props.navigationChainFileIds)
    }, [buildings, props.navigationChainFileIds])
    const navigationTrailVectors = useMemo((): ReadonlyArray<Vector3> => {
        return navigationTrail.map((point): Vector3 => new Vector3(...point))
    }, [navigationTrail])
    const visibleBuildings = useMemo((): ReadonlyArray<ICodeCityBuildingMesh> => {
        return buildings.filter((building): boolean => {
            return Math.hypot(building.x, building.z) <= renderBudget.cullingRadius
        })
    }, [buildings, renderBudget.cullingRadius])
    const interactiveBuildings = useMemo((): ReadonlyArray<ICodeCityBuildingMesh> => {
        if (renderBudget.useInstancing === false) {
            return visibleBuildings
        }

        const prioritized = visibleBuildings.filter((building): boolean => {
            if (props.selectedFileId === building.id) {
                return true
            }
            const impactState = impactMap.get(building.id)
            return impactState === "changed" || impactState === "impacted"
        })
        const remaining = visibleBuildings.filter((building): boolean => {
            return (
                prioritized.some(
                    (priorityBuilding): boolean => priorityBuilding.id === building.id,
                ) === false
            )
        })
        return [...prioritized, ...remaining].slice(0, renderBudget.maxInteractiveBuildings)
    }, [
        impactMap,
        props.selectedFileId,
        renderBudget.maxInteractiveBuildings,
        renderBudget.useInstancing,
        visibleBuildings,
    ])
    const interactiveBuildingIds = useMemo((): ReadonlySet<string> => {
        return new Set(interactiveBuildings.map((building): string => building.id))
    }, [interactiveBuildings])
    const instancedBuildings = useMemo((): ReadonlyArray<ICodeCityBuildingMesh> => {
        if (renderBudget.useInstancing === false) {
            return []
        }
        return visibleBuildings.filter((building): boolean => {
            return interactiveBuildingIds.has(building.id) === false
        })
    }, [interactiveBuildingIds, renderBudget.useInstancing, visibleBuildings])
    const bugEmissionBuildings = useMemo((): ReadonlyArray<ICodeCityBuildingMesh> => {
        return interactiveBuildings
            .filter((building): boolean => building.totalBugCount > 0)
            .sort((leftBuilding, rightBuilding): number => {
                return rightBuilding.totalBugCount - leftBuilding.totalBugCount
            })
            .slice(0, MAX_BUG_EMISSION_CLOUDS)
    }, [interactiveBuildings])
    const focusBuilding = useMemo((): ICodeCityBuildingMesh | undefined => {
        if (props.navigationActiveFileId !== undefined) {
            return buildings.find(
                (building): boolean => building.id === props.navigationActiveFileId,
            )
        }
        if (props.selectedFileId !== undefined) {
            return buildings.find((building): boolean => building.id === props.selectedFileId)
        }
        return buildings.at(0)
    }, [buildings, props.navigationActiveFileId, props.selectedFileId])
    const cameraPresetTarget = useMemo((): ICameraPresetTarget => {
        return resolveCameraPresetTarget(props.cameraPreset, focusBuilding)
    }, [focusBuilding, props.cameraPreset])

    return (
        <Canvas camera={{ fov: 45, position: [30, 26, 30] }} dpr={renderBudget.dpr} shadows={false}>
            <CameraPresetController controlsRef={controlsRef} target={cameraPresetTarget} />
            <RenderPerformanceController
                onSample={(fps): void => {
                    setSampledFps(Math.round(fps))
                }}
            />
            <color args={[SCENE_BACKGROUND]} attach="background" />
            <ambientLight intensity={0.55} />
            <directionalLight intensity={0.9} position={[18, 30, 12]} />
            <gridHelper
                args={[100, 80, SCENE_GRID_LINE, SCENE_GRID_DIVISION]}
                visible={renderBudget.quality !== "low"}
            />
            {districts.map(
                (district): ReactElement => (
                    <group key={`district-${district.id}`}>
                        <mesh position={[district.x, -0.03, district.z]}>
                            <boxGeometry args={[district.width, 0.06, district.depth]} />
                            <meshStandardMaterial
                                color={SCENE_DISTRICT_FLOOR}
                                metalness={0.02}
                                roughness={0.92}
                            />
                        </mesh>
                        <Text
                            anchorX="center"
                            anchorY="middle"
                            color={SCENE_DISTRICT_LABEL}
                            fontSize={Math.max(0.38, Math.min(0.95, district.width / 6))}
                            position={[district.x, 0.04, district.z]}
                            rotation={[-Math.PI / 2, 0, 0]}
                        >
                            {district.label}
                        </Text>
                    </group>
                ),
            )}
            {districtHealthAuras.map(
                (aura, index): ReactElement => (
                    <DistrictHealthAuraMesh
                        aura={aura}
                        key={`${aura.districtId}-health-aura`}
                        phaseSeed={index * 0.44}
                    />
                ),
            )}
            {navigationTrailVectors.length >= 2 ? (
                <Line
                    color={SCENE_NAVIGATION_TRAIL}
                    dashScale={2}
                    dashSize={0.3}
                    dashed={true}
                    gapSize={0.18}
                    lineWidth={1.2}
                    opacity={0.8}
                    points={navigationTrailVectors}
                    transparent={true}
                />
            ) : null}
            {navigationTrail.map(
                (point, index): ReactElement => (
                    <mesh
                        key={`breadcrumb-${String(index)}`}
                        position={[point[0], point[1], point[2]]}
                    >
                        <sphereGeometry args={[0.16, 10, 10]} />
                        <meshStandardMaterial
                            color={SCENE_BREADCRUMB_SPHERE}
                            emissive={SCENE_BREADCRUMB_EMISSIVE}
                            emissiveIntensity={0.9}
                            toneMapped={false}
                        />
                    </mesh>
                ),
            )}
            {visibleCausalArcs.map(
                (arc, index): ReactElement => (
                    <CausalArcMesh
                        arc={arc}
                        key={`${arc.sourceFileId}-${arc.targetFileId}-${arc.couplingType}`}
                        phaseSeed={index * 0.31}
                    />
                ),
            )}
            {bugEmissionBuildings.map(
                (building): ReactElement => (
                    <BugEmissionMesh
                        building={building}
                        key={`${building.id}-bug-emission`}
                        settings={resolveCodeCityBugEmissionSettings(
                            building.totalBugCount,
                            building.recentBugCount,
                        )}
                    />
                ),
            )}
            {interactiveBuildings.map(
                (building, index): ReactElement => (
                    <ImpactBuildingMesh
                        building={building}
                        impactState={impactMap.get(building.id) ?? "none"}
                        isSelected={props.selectedFileId === building.id}
                        key={building.id}
                        onHover={props.onBuildingHover}
                        onSelect={props.onBuildingSelect}
                        phaseSeed={index * 0.45}
                    />
                ),
            )}
            <InstancedBuildingsMesh buildings={instancedBuildings} />
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
