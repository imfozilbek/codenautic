import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IPromptTemplateRepository} from "../../ports/outbound/prompt-template-repository.port"
import {UniqueId} from "../../../domain/value-objects/unique-id.value-object"
import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import type {
    IGetPromptTemplateOutput,
    IPromptTemplateIdInput,
} from "../../dto/prompt/prompt-template.dto"
import {mapPromptTemplateToDTO} from "../../dto/prompt/prompt-template.dto"
import {Result} from "../../../shared/result"

/**
 * Dependencies for prompt template lookup.
 */
export interface IGetPromptTemplateByIdUseCaseDependencies {
    readonly promptTemplateRepository: IPromptTemplateRepository
}

/**
 * Reads prompt template by id.
 */
export class GetPromptTemplateByIdUseCase
    implements IUseCase<IPromptTemplateIdInput, IGetPromptTemplateOutput, ValidationError>
{
    private readonly promptTemplateRepository: IPromptTemplateRepository

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: IGetPromptTemplateByIdUseCaseDependencies) {
        this.promptTemplateRepository = dependencies.promptTemplateRepository
    }

    /**
     * Loads prompt template.
     *
     * @param input Request payload.
     * @returns Prompt template DTO.
     */
    public async execute(
        input: IPromptTemplateIdInput,
    ): Promise<Result<IGetPromptTemplateOutput, ValidationError>> {
        const fields = this.validateInput(input)
        if (fields.length > 0) {
            return Result.fail<IGetPromptTemplateOutput, ValidationError>(
                new ValidationError("Prompt template read validation failed", fields),
            )
        }

        const id = UniqueId.create(input.templateId.trim())
        const template = await this.promptTemplateRepository.findById(id)
        if (template === null) {
            return Result.fail<IGetPromptTemplateOutput, ValidationError>(
                new ValidationError("Prompt template read validation failed", [
                    {
                        field: "templateId",
                        message: "template not found",
                    },
                ]),
            )
        }

        return Result.ok<IGetPromptTemplateOutput, ValidationError>({
            template: mapPromptTemplateToDTO(template),
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
