import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IPromptTemplateRepository} from "../../ports/outbound/prompt-template-repository.port"
import {UniqueId} from "../../../domain/value-objects/unique-id.value-object"
import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import type {
    IDeletePromptTemplateOutput,
    IPromptTemplateIdInput,
} from "../../dto/prompt/prompt-template.dto"
import {Result} from "../../../shared/result"

/**
 * Dependencies for prompt template deletion.
 */
export interface IDeletePromptTemplateUseCaseDependencies {
    readonly promptTemplateRepository: IPromptTemplateRepository
}

/**
 * Deletes prompt template by id.
 */
export class DeletePromptTemplateUseCase
    implements IUseCase<IPromptTemplateIdInput, IDeletePromptTemplateOutput, ValidationError>
{
    private readonly promptTemplateRepository: IPromptTemplateRepository

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: IDeletePromptTemplateUseCaseDependencies) {
        this.promptTemplateRepository = dependencies.promptTemplateRepository
    }

    /**
     * Deletes prompt template.
     *
     * @param input Request payload.
     * @returns Deleted id.
     */
    public async execute(
        input: IPromptTemplateIdInput,
    ): Promise<Result<IDeletePromptTemplateOutput, ValidationError>> {
        const fields = this.validateInput(input)
        if (fields.length > 0) {
            return Result.fail<IDeletePromptTemplateOutput, ValidationError>(
                new ValidationError("Prompt template delete validation failed", fields),
            )
        }

        const id = UniqueId.create(input.templateId.trim())
        const existing = await this.promptTemplateRepository.findById(id)
        if (existing === null) {
            return Result.fail<IDeletePromptTemplateOutput, ValidationError>(
                new ValidationError("Prompt template delete validation failed", [
                    {
                        field: "templateId",
                        message: "template not found",
                    },
                ]),
            )
        }

        await this.promptTemplateRepository.deleteById(id)

        return Result.ok<IDeletePromptTemplateOutput, ValidationError>({
            templateId: id.value,
        })
    }

    private validateInput(input: IPromptTemplateIdInput): IValidationErrorField[] {
        if (typeof input.templateId !== "string" || input.templateId.trim().length === 0) {
            return [
                {
                    field: "templateId",
                    message: "must be a non-empty string",
                },
            ]
        }

        return []
    }
}
