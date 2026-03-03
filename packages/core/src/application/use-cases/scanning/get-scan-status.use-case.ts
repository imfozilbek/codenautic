import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IScanProgressRepository} from "../../ports/outbound/scanning/scan-progress-repository"
import type {IScanProgress} from "../../dto/scanning"
import type {IValidationErrorField} from "../../../domain/errors/validation.error"
import {ValidationError} from "../../../domain/errors/validation.error"
import {NotFoundError} from "../../../domain/errors/not-found.error"
import type {DomainError} from "../../../domain/errors/domain.error"
import {Result} from "../../../shared/result"

/**
 * Input payload for scan status query.
 */
export interface IGetScanStatusInput {
    /**
     * Scan identifier.
     */
    readonly scanId: string
}

/**
 * Dependencies for get scan status use case.
 */
interface INormalizedGetScanStatusInput {
    /**
     * Trimmed scan identifier.
     */
    readonly scanId: string
}

/**
 * Dependencies for get scan status use case.
 */
export interface IGetScanStatusUseCaseDependencies {
    /**
     * Scan progress repository port.
     */
    readonly scanProgressRepository: IScanProgressRepository
}

/**
 * Loads scan progress by identifier.
 */
export class GetScanStatusUseCase
    implements IUseCase<IGetScanStatusInput, IScanProgress, DomainError>
{
    private readonly scanProgressRepository: IScanProgressRepository

    /**
     * Creates use case instance.
     *
     * @param dependencies Required dependency ports.
     */
    public constructor(dependencies: IGetScanStatusUseCaseDependencies) {
        this.scanProgressRepository = dependencies.scanProgressRepository
    }

    /**
     * Loads progress by scan identifier.
     *
     * @param input Use case input.
     * @returns Scan progress or domain error.
     */
    public async execute(
        input: IGetScanStatusInput,
    ): Promise<Result<IScanProgress, DomainError>> {
        const normalizedInput = this.normalizeAndValidateInput(input)
        if (normalizedInput.isFail) {
            return Result.fail<IScanProgress, DomainError>(normalizedInput.error)
        }

        const progress = await this.scanProgressRepository.findByScanId(
            normalizedInput.value.scanId,
        )
        if (progress === null) {
            return Result.fail<IScanProgress, DomainError>(
                new NotFoundError("ScanProgress", normalizedInput.value.scanId),
            )
        }

        return Result.ok<IScanProgress, DomainError>(progress)
    }

    /**
     * Normalizes and validates incoming input.
     *
     * @param input Raw input.
     * @returns Normalized input or validation error.
     */
    private normalizeAndValidateInput(
        input: IGetScanStatusInput,
    ): Result<INormalizedGetScanStatusInput, ValidationError> {
        const fields = this.validateInput(input)
        if (fields.length > 0) {
            return Result.fail<INormalizedGetScanStatusInput, ValidationError>(
                new ValidationError("Get scan status validation failed", fields),
            )
        }

        return Result.ok<INormalizedGetScanStatusInput, ValidationError>({
            scanId: input.scanId.trim(),
        })
    }

    /**
     * Performs input shape checks.
     *
     * @param input Raw input.
     * @returns List of validation fields.
     */
    private validateInput(input: IGetScanStatusInput): IValidationErrorField[] {
        const fields: IValidationErrorField[] = []

        if (typeof input.scanId !== "string" || input.scanId.trim().length === 0) {
            fields.push({
                field: "scanId",
                message: "must be a non-empty string",
            })
        }

        return fields
    }
}
