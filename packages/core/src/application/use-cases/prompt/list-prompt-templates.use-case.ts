import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IPromptTemplateRepository} from "../../ports/outbound/prompt-template-repository.port"
import type {
    IListPromptTemplatesInput,
    IListPromptTemplatesOutput,
} from "../../dto/prompt/prompt-template.dto"
import {mapPromptTemplateToDTO} from "../../dto/prompt/prompt-template.dto"
import {Result} from "../../../shared/result"
import {ValidationError} from "../../../domain/errors/validation.error"

/**
 * Dependencies for prompt template listing.
 */
export interface IListPromptTemplatesUseCaseDependencies {
    readonly promptTemplateRepository: IPromptTemplateRepository
}

/**
 * Lists prompt templates for admin API.
 */
export class ListPromptTemplatesUseCase
    implements IUseCase<IListPromptTemplatesInput, IListPromptTemplatesOutput, ValidationError>
{
    private readonly promptTemplateRepository: IPromptTemplateRepository

    /**
     * Creates use case instance.
     *
     * @param dependencies Use case dependencies.
     */
    public constructor(dependencies: IListPromptTemplatesUseCaseDependencies) {
        this.promptTemplateRepository = dependencies.promptTemplateRepository
    }

    /**
     * Lists all prompt templates.
     *
     * @param _input Request payload.
     * @returns List result.
     */
    public async execute(
        _input: IListPromptTemplatesInput,
    ): Promise<Result<IListPromptTemplatesOutput, ValidationError>> {
        const templates = await this.promptTemplateRepository.findAll()
        const mapped = templates.map((template) => mapPromptTemplateToDTO(template))

        return Result.ok<IListPromptTemplatesOutput, ValidationError>({
            templates: mapped,
            total: mapped.length,
        })
    }
}
