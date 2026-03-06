import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {ILibraryRuleRepository} from "../../ports/outbound/rule/library-rule-repository.port"
import type {
    IDeleteLibraryRuleOutput,
    ILibraryRuleIdInput,
} from "../../dto/rules/library-rule.dto"
import {Result} from "../../../shared/result"

/**
 * Dependencies for library rule deletion.
 */
export interface IDeleteRuleUseCaseDependencies {
    readonly libraryRuleRepository: ILibraryRuleRepository
}

/**
 * Deletes library rule by uuid.
 */
export class DeleteRuleUseCase
    implements IUseCase<ILibraryRuleIdInput, IDeleteLibraryRuleOutput, ValidationError>
{
    private readonly libraryRuleRepository: ILibraryRuleRepository

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: IDeleteRuleUseCaseDependencies) {
        this.libraryRuleRepository = dependencies.libraryRuleRepository
    }

    /**
     * Deletes library rule.
     *
     * @param input Request payload.
     * @returns Deleted rule id payload.
     */
    public async execute(
        input: ILibraryRuleIdInput,
    ): Promise<Result<IDeleteLibraryRuleOutput, ValidationError>> {
        const fields = this.validateInput(input)
        if (fields.length > 0) {
            return Result.fail<IDeleteLibraryRuleOutput, ValidationError>(
                new ValidationError("Library rule delete validation failed", fields),
            )
        }

        const rule = await this.libraryRuleRepository.findByUuid(input.ruleUuid.trim())
        if (rule === null) {
            return Result.fail<IDeleteLibraryRuleOutput, ValidationError>(
                new ValidationError("Library rule delete validation failed", [
                    {
                        field: "ruleUuid",
                        message: "rule not found",
                    },
                ]),
            )
        }

        await this.libraryRuleRepository.delete(rule.id)

        return Result.ok<IDeleteLibraryRuleOutput, ValidationError>({
            ruleUuid: rule.uuid,
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
