import {dirname, extname, resolve} from "node:path"
import {existsSync, statSync} from "node:fs"
import ts from "typescript"

import type {
    IArchitectureHealthScore,
    IArchitectureHealthScoreDimensions,
} from "../dto/architecture/architecture-health-score.dto"
import type {
    IDDDComplianceReport,
    IDDDAggregateHealth,
    IDDDViolation,
    IAnemicModelViolationType,
} from "../dto/architecture/ddd-compliance-report.dto"
import type {ILayerViolationDTO} from "../dto/architecture/layer-violation.dto"
import {
    collectTypeScriptFiles,
    validateDependencyDirection,
} from "../../shared/dependency-direction-guard"

/**
 * Contract for repository architecture analyzer service.
 */
export interface IArchitectureAnalyzer {
    /**
     * Computes overall architecture health score.
     *
     * @param repoId Repository identifier or path.
     * @returns Health score.
     */
    analyzeHealth(repoId: string): Promise<IArchitectureHealthScore>

    /**
     * Detects import-layer violations inside repository.
     *
     * @param repoId Repository identifier or path.
     * @returns Layer violation list.
     */
    detectViolations(repoId: string): Promise<readonly ILayerViolationDTO[]>

    /**
     * Computes DDD compliance diagnostics.
     *
     * @param repoId Repository identifier or path.
     * @returns DDD compliance report.
     */
    getDDDCompliance(repoId: string): Promise<IDDDComplianceReport>
}

/**
 * Default application service implementation of repository architecture analysis.
 */
export class ArchitectureAnalyzer implements IArchitectureAnalyzer {
    private static readonly MAX_SCORE = 100
    private static readonly MIN_SCORE = 0
    private static readonly COHESION_WEIGHT = 16
    private static readonly LAYER_COMPLIANCE_PENALTY = 8
    private static readonly COUPLING_PENALTY_PER_TARGET = 4

    /**
     * {@inheritDoc}
     */
    public async analyzeHealth(repoId: string): Promise<IArchitectureHealthScore> {
        const [violations, dddCompliance] = await Promise.all([
            this.detectViolations(repoId),
            this.getDDDCompliance(repoId),
        ])

        const dimensions = this.calculateDimensions(violations, dddCompliance)

        return {
            overall: this.calculateOverallScore(dimensions),
            dimensions,
            violations,
            anemicModelIndex: this.calculateAnemicModelIndex(dddCompliance),
        }
    }

    /**
     * {@inheritDoc}
     */
    public detectViolations(repoId: string): Promise<readonly ILayerViolationDTO[]> {
        const repositoryPath = this.resolveRepositoryPath(repoId)
        if (repositoryPath === null) {
            return Promise.resolve([])
        }

        const snapshots = collectTypeScriptFiles(repositoryPath)
        const violations = validateDependencyDirection(snapshots)

        return Promise.resolve(
            violations.map((violation) => {
                return {
                    sourceLayer: violation.sourceLayer,
                    targetLayer: violation.targetLayer,
                    sourceFile: violation.sourceFile,
                    targetFile: this.resolveTargetFile(violation.sourceFile, violation.importPath),
                    importPath: violation.importPath,
                }
            }),
        )
    }

    /**
     * {@inheritDoc}
     */
    public getDDDCompliance(repoId: string): Promise<IDDDComplianceReport> {
        const repositoryPath = this.resolveRepositoryPath(repoId)
        if (repositoryPath === null) {
            return Promise.resolve({
                violations: [],
                aggregateHealth: [],
                boundedContexts: [],
            })
        }

        const domainPath = resolve(repositoryPath, "src", "domain")
        const snapshots = collectTypeScriptFiles(domainPath)
        const aggregateHealth: IDDDAggregateHealth[] = []
        const violations: IDDDViolation[] = []
        const boundedContexts = new Set<string>()

        for (const snapshot of snapshots) {
            const boundedContext = this.resolveBoundedContext(snapshot.path)
            if (boundedContext !== null) {
                boundedContexts.add(boundedContext)
            }

            const profiles = this.collectDomainProfiles(snapshot.path, snapshot.content)
            aggregateHealth.push(...profiles)
            violations.push(
                ...profiles
                    .filter((profile) => this.isAnemicAggregate(profile))
                    .map((profile) => {
                        return {
                            type: "ANEMIC_MODEL" as IAnemicModelViolationType,
                            entity: profile.name,
                            description: `Model "${profile.name}" has insufficient method count`,
                        }
                    }),
            )
        }

        return Promise.resolve({
            violations,
            aggregateHealth,
            boundedContexts: [...boundedContexts].sort(),
        })
    }

    /**
     * Builds score dimensions from dependency and DDD measurements.
     *
     * @param violations Layer violations.
     * @param dddCompliance DDD report.
     * @returns Score dimensions.
     */
    private calculateDimensions(
        violations: readonly ILayerViolationDTO[],
        dddCompliance: IDDDComplianceReport,
    ): IArchitectureHealthScoreDimensions {
        return {
            coupling: this.calculateCouplingScore(violations),
            cohesion: this.calculateCohesionScore(dddCompliance),
            layerCompliance: this.calculateLayerComplianceScore(violations),
            dddCompliance: this.calculateDDDComplianceScore(dddCompliance),
        }
    }

    /**
     * Computes average methods health as cohesion proxy.
     *
     * @param dddCompliance DDD report.
     * @returns Clamped score.
     */
    private calculateCohesionScore(dddCompliance: IDDDComplianceReport): number {
        if (dddCompliance.aggregateHealth.length === 0) {
            return ArchitectureAnalyzer.MAX_SCORE
        }

        const totalMethods = dddCompliance.aggregateHealth.reduce(
            (accumulator, aggregate) => accumulator + aggregate.methodCount,
            0,
        )
        const averageMethods = totalMethods / dddCompliance.aggregateHealth.length
        return this.normalizeScore(averageMethods * ArchitectureAnalyzer.COHESION_WEIGHT)
    }

    /**
     * Penalizes number of distinct dependency targets.
     *
     * @param violations Layer violations.
     * @returns Clamped score.
     */
    private calculateCouplingScore(violations: readonly ILayerViolationDTO[]): number {
        const targetFiles = new Set(violations.map((violation) => violation.targetFile))
        const penalty = targetFiles.size * ArchitectureAnalyzer.COUPLING_PENALTY_PER_TARGET
        return this.normalizeScore(ArchitectureAnalyzer.MAX_SCORE - penalty)
    }

    /**
     * Penalizes each detected violation.
     *
     * @param violations Layer violations.
     * @returns Clamped score.
     */
    private calculateLayerComplianceScore(violations: readonly ILayerViolationDTO[]): number {
        const penalty = violations.length * ArchitectureAnalyzer.LAYER_COMPLIANCE_PENALTY
        return this.normalizeScore(ArchitectureAnalyzer.MAX_SCORE - penalty)
    }

    /**
     * Scores DDD health by ratio of clean models.
     *
     * @param dddCompliance DDD report.
     * @returns Clamped score.
     */
    private calculateDDDComplianceScore(dddCompliance: IDDDComplianceReport): number {
        if (dddCompliance.aggregateHealth.length === 0) {
            return ArchitectureAnalyzer.MAX_SCORE
        }

        const cleanModels = dddCompliance.aggregateHealth.length - dddCompliance.violations.length
        const ratio = cleanModels / dddCompliance.aggregateHealth.length
        return this.normalizeScore(ArchitectureAnalyzer.MAX_SCORE * ratio)
    }

    /**
     * Calculates anemic model index: higher value means cleaner domain models.
     *
     * @param dddCompliance DDD report.
     * @returns Clamped score.
     */
    private calculateAnemicModelIndex(dddCompliance: IDDDComplianceReport): number {
        if (dddCompliance.aggregateHealth.length === 0) {
            return ArchitectureAnalyzer.MIN_SCORE
        }

        const anemicCount = dddCompliance.violations.filter((item) => item.type === "ANEMIC_MODEL").length
        const healthyCount = dddCompliance.aggregateHealth.length - anemicCount
        const healthyRatio = healthyCount / dddCompliance.aggregateHealth.length
        return this.normalizeScore(healthyRatio * ArchitectureAnalyzer.MAX_SCORE)
    }

    /**
     * Averages all dimensions to a single score.
     *
     * @param dimensions Dimension scores.
     * @returns Clamped overall score.
     */
    private calculateOverallScore(dimensions: IArchitectureHealthScoreDimensions): number {
        const rawScore = (
            dimensions.coupling +
            dimensions.cohesion +
            dimensions.layerCompliance +
            dimensions.dddCompliance
        ) / 4
        return this.normalizeScore(rawScore)
    }

    /**
     * Resolves repository path; accepts file path and path-like identifier.
     *
     * @param repoId Repository identifier.
     * @returns Repository root directory path or null.
     */
    private resolveRepositoryPath(repoId: string): string | null {
        const resolved = resolve(repoId)
        if (existsSync(resolved) === false) {
            return null
        }
        if (statSync(resolved).isDirectory()) {
            return resolved
        }
        return dirname(resolved)
    }

    /**
     * Resolves target file for violation record.
     *
     * @param sourceFile Source file path.
     * @param importPath Import specifier.
     * @returns Approximate target path.
     */
    private resolveTargetFile(sourceFile: string, importPath: string): string {
        if (importPath.startsWith(".")) {
            return resolve(dirname(sourceFile), importPath)
        }
        if (importPath.startsWith("/")) {
            return resolve(importPath)
        }

        return importPath
    }

    /**
     * Parses domain models and collects aggregate-like profiles.
     *
     * @param snapshotPath Snapshot path.
     * @param snapshotContent Snapshot source.
     * @returns Profile list.
     */
    private collectDomainProfiles(
        snapshotPath: string,
        snapshotContent: string,
    ): readonly IDDDAggregateHealth[] {
        const scriptKind = this.resolveScriptKind(snapshotPath)
        const sourceFile = ts.createSourceFile(snapshotPath, snapshotContent, ts.ScriptTarget.Latest, true, scriptKind)
        const result: IDDDAggregateHealth[] = []

        const visitNode = (node: ts.Node): void => {
            if (ts.isClassDeclaration(node) && node.name !== undefined) {
                const methodCount = this.countClassMethods(node)
                const eventCount = this.countDomainEvents(node)
                result.push({
                    name: node.name.text,
                    eventCount,
                    methodCount,
                })
            }
            ts.forEachChild(node, visitNode)
        }

        visitNode(sourceFile)
        return result
    }

    /**
     * Counts method declarations in class.
     *
     * @param node Class declaration.
     * @returns Number of methods.
     */
    private countClassMethods(node: ts.ClassDeclaration): number {
        let count = 0
        for (const member of node.members) {
            if (ts.isMethodDeclaration(member)) {
                count += 1
            }
        }
        return count
    }

    /**
     * Counts member declarations that reference domain events.
     *
     * @param node Class declaration.
     * @returns Event-like members count.
     */
    private countDomainEvents(node: ts.ClassDeclaration): number {
        let count = 0
        for (const member of node.members) {
            if (ts.isMethodDeclaration(member) && member.name !== undefined) {
                const nameText = this.readMemberName(member.name)
                if (nameText !== null && nameText.endsWith("Event")) {
                    count += 1
                }
            }
        }
        return count
    }

    /**
     * Maps node name to plain string when possible.
     *
     * @param name Class/member name node.
     * @returns Readable member name.
     */
    private readMemberName(name: ts.PropertyName): string | null {
        if (ts.isIdentifier(name)) {
            return name.text
        }
        if (ts.isStringLiteralLike(name)) {
            return name.text
        }
        return null
    }

    /**
     * Reads domain context from file path.
     *
     * @param filePath Snapshot path.
     * @returns Bounded context.
     */
    private resolveBoundedContext(filePath: string): string | null {
        return this.extractDomainContext(filePath)
    }

    /**
     * Extracts bounded context for domain file.
     *
     * @param filePath Snapshot path.
     * @returns Context name.
     */
    private extractDomainContext(filePath: string): string | null {
        const marker = "/src/domain/"
        const normalized = filePath.replaceAll("\\", "/")
        const markerIndex = normalized.indexOf(marker)
        if (markerIndex === -1) {
            return null
        }

        const remaining = normalized.slice(markerIndex + marker.length)
        const context = remaining.split("/")[0]
        if (context === undefined || context.length === 0) {
            return null
        }

        return context
    }

    /**
     * Resolves TS script kind by extension.
     *
     * @param filePath Snapshot path.
     * @returns Script kind.
     */
    private resolveScriptKind(filePath: string): ts.ScriptKind {
        const extension = extname(filePath).toLowerCase()
        if (extension === ".tsx" || extension === ".jsx") {
            return ts.ScriptKind.TSX
        }
        return ts.ScriptKind.TS
    }

    /**
     * Checks whether aggregate profile should be flagged as anemic.
     *
     * @param profile Aggregate profile.
     * @returns True when aggregate is anemic.
     */
    private isAnemicAggregate(profile: IDDDAggregateHealth): boolean {
        return profile.methodCount <= 1
    }

    /**
     * Normalizes score to range 0..100.
     *
     * @param score Raw score.
     * @returns Bounded score.
     */
    private normalizeScore(score: number): number {
        if (score < ArchitectureAnalyzer.MIN_SCORE) {
            return ArchitectureAnalyzer.MIN_SCORE
        }
        if (score > ArchitectureAnalyzer.MAX_SCORE) {
            return ArchitectureAnalyzer.MAX_SCORE
        }
        return Math.round(score)
    }
}
