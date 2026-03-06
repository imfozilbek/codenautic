import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {ILibraryRuleRepository} from "../../ports/outbound/rule/library-rule-repository.port"
import type {
    IGetLibraryRuleOutput,
    ILibraryRuleIdInput,
} from "../../dto/rules/library-rule.dto"
import {mapLibraryRuleToDTO} from "../../dto/rules/library-rule.dto"
import {Result} from "../../../shared/result"

/**
 * Dependencies for library rule lookup.
 */
export interface IGetRuleByIdUseCaseDependencies {
    readonly libraryRuleRepository: ILibraryRuleRepository
}

/**
 * Reads library rule by uuid.
 */
export class GetRuleByIdUseCase
    implements IUseCase<ILibraryRuleIdInput, IGetLibraryRuleOutput, ValidationError>
{
    private readonly libraryRuleRepository: ILibraryRuleRepository

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: IGetRuleByIdUseCaseDependencies) {
        this.libraryRuleRepository = dependencies.libraryRuleRepository
    }

    /**
     * Loads library rule.
     *
     * @param input Request payload.
     * @returns Rule DTO.
     */
    public async execute(
        input: ILibraryRuleIdInput,
    ): Promise<Result<IGetLibraryRuleOutput, ValidationError>> {
        const fields = this.validateInput(input)
        if (fields.length > 0) {
            return Result.fail<IGetLibraryRuleOutput, ValidationError>(
                new ValidationError("Library rule read validation failed", fields),
            )
        }

        const rule = await this.libraryRuleRepository.findByUuid(input.ruleUuid.trim())
        if (rule === null) {
            return Result.fail<IGetLibraryRuleOutput, ValidationError>(
                new ValidationError("Library rule read validation failed", [
                    {
                        field: "ruleUuid",
                        message: "rule not found",
                    },
                ]),
            )
        }

        return Result.ok<IGetLibraryRuleOutput, ValidationError>({
            rule: mapLibraryRuleToDTO(rule),
        })
    }

    private validateInput(input: ILibraryRuleIdInput): IValidationErrorField[] {
        if (typeof input.ruleUuid !== "string" || input.ruleUuid.trim().length === 0) {
            return [
                {
                    field: "ruleUuid",
                    message: "must be a non-empty string",
                },
            ]
        }

        return []
    }
}
