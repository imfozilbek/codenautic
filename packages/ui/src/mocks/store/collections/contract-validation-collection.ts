import type {
    IArchitectureEdge,
    IArchitectureNode,
    IDriftTrendPoint,
    IDriftViolation,
} from "@/lib/api/endpoints/contract-validation.endpoint"

/**
 * Входные данные для seed contract validation коллекции.
 */
export interface IContractValidationSeedData {
    /** YAML-содержимое blueprint. */
    readonly blueprintYaml: string
    /** YAML-содержимое guardrails. */
    readonly guardrailsYaml: string
    /** Начальный набор drift-нарушений. */
    readonly violations: ReadonlyArray<IDriftViolation>
    /** Начальный набор точек тренда. */
    readonly trendPoints: ReadonlyArray<IDriftTrendPoint>
    /** Начальный набор узлов графа архитектуры. */
    readonly architectureNodes: ReadonlyArray<IArchitectureNode>
    /** Начальный набор рёбер графа архитектуры. */
    readonly architectureEdges: ReadonlyArray<IArchitectureEdge>
}

/**
 * Коллекция contract validation для mock API.
 *
 * Хранит in-memory blueprint YAML, guardrails YAML,
 * drift-нарушения, тренд и граф архитектуры.
 * Поддерживает get/update для YAML, list для нарушений, seed и clear.
 */
export class ContractValidationCollection {
    /**
     * YAML-содержимое blueprint.
     */
    private blueprintYaml: string = ""

    /**
     * YAML-содержимое guardrails.
     */
    private guardrailsYaml: string = ""

    /**
     * Хранилище drift-нарушений по ID.
     */
    private violations: Map<string, IDriftViolation> = new Map()

    /**
     * Точки данных тренда drift-нарушений.
     */
    private trendPoints: ReadonlyArray<IDriftTrendPoint> = []

    /**
     * Узлы графа архитектуры.
     */
    private architectureNodes: ReadonlyArray<IArchitectureNode> = []

    /**
     * Рёбра графа архитектуры.
     */
    private architectureEdges: ReadonlyArray<IArchitectureEdge> = []

    /**
     * Возвращает текущий YAML blueprint.
     *
     * @returns YAML-содержимое blueprint.
     */
    public getBlueprint(): string {
        return this.blueprintYaml
    }

    /**
     * Обновляет YAML blueprint.
     *
     * @param yaml - Новое YAML-содержимое.
     */
    public updateBlueprint(yaml: string): void {
        this.blueprintYaml = yaml
    }

    /**
     * Возвращает текущий YAML guardrails.
     *
     * @returns YAML-содержимое guardrails.
     */
    public getGuardrails(): string {
        return this.guardrailsYaml
    }

    /**
     * Обновляет YAML guardrails.
     *
     * @param yaml - Новое YAML-содержимое.
     */
    public updateGuardrails(yaml: string): void {
        this.guardrailsYaml = yaml
    }

    /**
     * Возвращает все drift-нарушения.
     *
     * @returns Массив drift-нарушений.
     */
    public listViolations(): ReadonlyArray<IDriftViolation> {
        return Array.from(this.violations.values())
    }

    /**
     * Возвращает точки данных тренда.
     *
     * @returns Массив точек тренда.
     */
    public getTrendPoints(): ReadonlyArray<IDriftTrendPoint> {
        return this.trendPoints
    }

    /**
     * Возвращает узлы графа архитектуры.
     *
     * @returns Массив узлов.
     */
    public getArchitectureNodes(): ReadonlyArray<IArchitectureNode> {
        return this.architectureNodes
    }

    /**
     * Возвращает рёбра графа архитектуры.
     *
     * @returns Массив рёбер.
     */
    public getArchitectureEdges(): ReadonlyArray<IArchitectureEdge> {
        return this.architectureEdges
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * Очищает текущее состояние и загружает переданные данные.
     *
     * @param data - Начальные данные для заполнения.
     */
    public seed(data: IContractValidationSeedData): void {
        this.clear()

        this.blueprintYaml = data.blueprintYaml
        this.guardrailsYaml = data.guardrailsYaml
        this.trendPoints = data.trendPoints
        this.architectureNodes = data.architectureNodes
        this.architectureEdges = data.architectureEdges

        for (const violation of data.violations) {
            this.violations.set(violation.id, violation)
        }
    }

    /**
     * Полностью очищает коллекцию и сбрасывает все данные.
     */
    public clear(): void {
        this.blueprintYaml = ""
        this.guardrailsYaml = ""
        this.violations.clear()
        this.trendPoints = []
        this.architectureNodes = []
        this.architectureEdges = []
    }
}
