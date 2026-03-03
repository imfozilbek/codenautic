import type {ArchitectureLayer} from "../../../shared/dependency-direction-guard"

/**
 * One architecture layer transition violation.
 */
export interface ILayerViolationDTO {
    /**
     * Source architecture layer.
     */
    readonly sourceLayer: ArchitectureLayer

    /**
     * Target architecture layer.
     */
    readonly targetLayer: ArchitectureLayer

    /**
     * Source file that owns violating import.
     */
    readonly sourceFile: string

    /**
     * Target file resolved from import path.
     */
    readonly targetFile: string

    /**
     * Raw import path used in source file.
     */
    readonly importPath: string
}

