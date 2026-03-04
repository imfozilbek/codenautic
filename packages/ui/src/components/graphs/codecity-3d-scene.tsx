import { Suspense, lazy, useMemo, type ReactElement } from "react"

interface ICodeCity3DSceneFileDescriptor {
    /** Уникальный ID файла. */
    readonly id: string
    /** Путь файла. */
    readonly path: string
    /** Объём строк кода. */
    readonly loc?: number
    /** Оценка сложности. */
    readonly complexity?: number
    /** Покрытие файла тестами. */
    readonly coverage?: number
}

/**
 * Параметры 3D CodeCity preview.
 */
export interface ICodeCity3DSceneProps {
    /** Заголовок для ARIA/описания сцены. */
    readonly title: string
    /** Набор файлов для генерации зданий. */
    readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
    /** Высота canvas-контейнера. */
    readonly height?: number
}

const LazyCodeCity3DSceneRenderer = lazy(
    async (): Promise<{
        default: (props: {
            readonly files: ReadonlyArray<ICodeCity3DSceneFileDescriptor>
        }) => ReactElement
    }> => {
        const module = await import("./codecity-3d-scene-renderer")
        return {
            default: module.CodeCity3DSceneRenderer,
        }
    },
)

/**
 * Обёртка 3D сцены: проверяет WebGL и лениво подгружает renderer.
 *
 * @param props Конфигурация 3D preview.
 * @returns 3D canvas или fallback при отсутствии WebGL.
 */
export function CodeCity3DScene(props: ICodeCity3DSceneProps): ReactElement {
    const isWebGlSupported = useMemo((): boolean => {
        if (typeof document === "undefined") {
            return false
        }

        const canvas = document.createElement("canvas")
        const webGlContext = canvas.getContext("webgl")
        const webGl2Context = canvas.getContext("webgl2")
        return webGlContext !== null || webGl2Context !== null
    }, [])

    if (isWebGlSupported === false) {
        return (
            <div
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700"
                role="status"
            >
                WebGL unavailable on this device. Switch to 2D treemap mode.
            </div>
        )
    }

    return (
        <section
            aria-label={props.title}
            className="w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-950/95"
            style={{ height: `${String(props.height ?? 420)}px` }}
        >
            <Suspense
                fallback={
                    <div className="flex h-full items-center justify-center text-sm text-slate-300">
                        Loading 3D scene...
                    </div>
                }
            >
                <LazyCodeCity3DSceneRenderer files={props.files} />
            </Suspense>
        </section>
    )
}

export type { ICodeCity3DSceneFileDescriptor }
