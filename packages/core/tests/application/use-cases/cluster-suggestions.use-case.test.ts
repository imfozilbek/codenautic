import {describe, expect, test} from "bun:test"

import {ValidationError} from "../../../src/domain/errors/validation.error"
import {
    ClusterSuggestionsUseCase,
    type IClusterSuggestionsInput,
} from "../../../src/application/use-cases/cluster-suggestions.use-case"
import type {IClusteringDefaults} from "../../../src/application/dto/config/system-defaults.dto"

const clusteringDefaults: IClusteringDefaults = {
    mode: "MINIMAL",
    similarityThreshold: 0.75,
    embeddingModel: "default-embedding-model",
}

describe("ClusterSuggestionsUseCase", () => {
    test("returns individual parent clusters in MINIMAL mode", async () => {
        const useCase = new ClusterSuggestionsUseCase({defaults: clusteringDefaults})
        const result = await useCase.execute({
            mode: "MINIMAL",
            suggestions: [
                {
                    suggestionId: "s-1",
                    problemDescription: "Проблема с валидацией",
                    actionStatement: "Выполнить дополнительную проверку входа",
                },
                {
                    suggestionId: "s-2",
                    problemDescription: "Проблема с типами",
                    actionStatement: "Свести типы к числовому диапазону",
                },
            ],
        })

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value).toEqual([
            {
                type: "parent",
                relatedSuggestionIds: ["s-1"],
                problemDescription: "Проблема с валидацией",
                actionStatement: "Выполнить дополнительную проверку входа",
            },
            {
                type: "parent",
                relatedSuggestionIds: ["s-2"],
                problemDescription: "Проблема с типами",
                actionStatement: "Свести типы к числовому диапазону",
            },
        ])
    })

    test("clusters by similarity in SMART mode", async () => {
        const useCase = new ClusterSuggestionsUseCase({defaults: clusteringDefaults})
        const result = await useCase.execute({
            mode: "SMART",
            similarityThreshold: 0.9,
            suggestions: [
                {
                    suggestionId: "s-1",
                    problemDescription: "Дубликат блоков в одном модуле",
                    actionStatement: "Свести к одному месту",
                    embedding: {
                        vector: [1, 0],
                        model: "test-model",
                    },
                },
                {
                    suggestionId: "s-2",
                    problemDescription: "Практически такой же дубликат",
                    actionStatement: "Свести к одному месту",
                    embedding: {
                        vector: [1, 0.1],
                        model: "test-model",
                    },
                },
                {
                    suggestionId: "s-3",
                    problemDescription: "Независимое замечание",
                    actionStatement: "Отдельное исправление",
                    embedding: {
                        vector: [0, 1],
                        model: "test-model",
                    },
                },
            ],
        })

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value).toEqual([
            {
                type: "parent",
                relatedSuggestionIds: ["s-1", "s-2"],
                problemDescription: "Дубликат блоков в одном модуле",
                actionStatement: "Свести к одному месту",
            },
            {
                type: "parent",
                relatedSuggestionIds: ["s-3"],
                problemDescription: "Независимое замечание",
                actionStatement: "Отдельное исправление",
            },
        ])
    })

    test("returns parent and related clusters in FULL mode", async () => {
        const useCase = new ClusterSuggestionsUseCase({defaults: clusteringDefaults})
        const result = await useCase.execute({
            mode: "FULL",
            similarityThreshold: 0.9,
            suggestions: [
                {
                    suggestionId: "s-1",
                    problemDescription: "Нечистая логика валидации",
                    actionStatement: "Вынести в отдельный валидатор",
                    embedding: {
                        vector: [1, 0],
                        model: "test-model",
                    },
                },
                {
                    suggestionId: "s-2",
                    problemDescription: "Повторная проверка той же логики",
                    actionStatement: "Удалить дублирование",
                    embedding: {
                        vector: [1, 0.05],
                        model: "test-model",
                    },
                },
                {
                    suggestionId: "s-3",
                    problemDescription: "Неподходящее место исправления",
                    actionStatement: "Не трогать",
                    embedding: {
                        vector: [0, 1],
                        model: "test-model",
                    },
                },
            ],
        })

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value).toEqual([
            {
                type: "parent",
                relatedSuggestionIds: ["s-1", "s-2"],
                problemDescription: "Нечистая логика валидации",
                actionStatement: "Вынести в отдельный валидатор",
            },
            {
                type: "related",
                relatedSuggestionIds: ["s-2"],
                parentSuggestionId: "s-1",
                problemDescription: "Повторная проверка той же логики",
                actionStatement: "Удалить дублирование",
            },
            {
                type: "parent",
                relatedSuggestionIds: ["s-3"],
                problemDescription: "Неподходящее место исправления",
                actionStatement: "Не трогать",
            },
        ])
    })

    test("returns validation error for invalid mode", async () => {
        const useCase = new ClusterSuggestionsUseCase({defaults: clusteringDefaults})
        const result = await useCase.execute({
            mode: "BROKEN" as unknown as IClusterSuggestionsInput["mode"],
            suggestions: [
                {
                    suggestionId: "s-1",
                    problemDescription: "Проверка режима",
                    actionStatement: "Никогда не запускать",
                    embedding: {
                        vector: [1, 0],
                        model: "test-model",
                    },
                },
            ],
        })

        if (result.isOk) {
            throw new Error("Expected validation error")
        }

        expect(result.error).toBeInstanceOf(ValidationError)
        expect(result.error.fields).toEqual([
            {
                field: "mode",
                message: "mode must be one of MINIMAL, SMART, FULL",
            },
        ])
    })

    test("requires embeddings for SMART mode", async () => {
        const useCase = new ClusterSuggestionsUseCase({defaults: clusteringDefaults})
        const result = await useCase.execute({
            mode: "SMART",
            suggestions: [
                {
                    suggestionId: "s-1",
                    problemDescription: "Критичное замечание",
                    actionStatement: "Починить",
                    embedding: {
                        vector: [1, 0],
                        model: "test-model",
                    },
                },
                {
                    suggestionId: "s-2",
                    problemDescription: "Критичное замечание 2",
                    actionStatement: "Починить ещё раз",
                },
            ],
        })

        if (result.isOk) {
            throw new Error("Expected validation error")
        }

        expect(result.error.fields).toEqual([
            {
                field: "suggestions.1.embedding",
                message: "embedding is required for SMART and FULL modes",
            },
        ])
    })

    test("returns empty clusters for empty input", async () => {
        const useCase = new ClusterSuggestionsUseCase({defaults: clusteringDefaults})
        const result = await useCase.execute({
            suggestions: [],
        })

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value).toEqual([])
    })
})
