export {
    type IRegisterAstModuleOptions,
    registerAstModule,
} from "./ast.module"
export {AST_TOKENS} from "./ast.tokens"
export {
    AST_ADVANCED_CODE_ANALYSIS_ERROR_CODE,
    AstAdvancedCodeAnalysisError,
    type AstAdvancedCodeAnalysisErrorCode,
    type IAstAdvancedCodeAnalysisErrorDetails,
} from "./ast-advanced-code-analysis.error"
export {
    AST_CODE_DEDUPLICATION_ERROR_CODE,
    AstCodeDeduplicationError,
    type AstCodeDeduplicationErrorCode,
    type IAstCodeDeduplicationErrorDetails,
} from "./ast-code-deduplication.error"
export {
    AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE,
    AstSemanticCodeUnderstandingError,
    type AstSemanticCodeUnderstandingErrorCode,
    type IAstSemanticCodeUnderstandingErrorDetails,
} from "./ast-semantic-code-understanding.error"
export {
    AST_CROSS_FILE_REFERENCE_RESOLUTION_ERROR_CODE,
    AstCrossFileReferenceResolutionError,
    type AstCrossFileReferenceResolutionErrorCode,
    type IAstCrossFileReferenceResolutionErrorDetails,
} from "./ast-cross-file-reference-resolution.error"
export {
    AST_CROSS_FILE_ANALYZER_ERROR_CODE,
    AstCrossFileAnalyzerError,
    type AstCrossFileAnalyzerErrorCode,
    type IAstCrossFileAnalyzerErrorDetails,
} from "./ast-cross-file-analyzer.error"
export {
    AST_DEPENDENCY_CHAIN_RESOLVER_ERROR_CODE,
    AstDependencyChainResolverError,
    type AstDependencyChainResolverErrorCode,
    type IAstDependencyChainResolverErrorDetails,
} from "./ast-dependency-chain-resolver.error"
export {
    AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE,
    AstBreakingChangeDetectorError,
    type AstBreakingChangeDetectorErrorCode,
    type IAstBreakingChangeDetectorErrorDetails,
} from "./ast-breaking-change-detector.error"
export {
    AST_CIRCULAR_DEPENDENCY_DETECTOR_ERROR_CODE,
    AstCircularDependencyDetectorError,
    type AstCircularDependencyDetectorErrorCode,
    type IAstCircularDependencyDetectorErrorDetails,
} from "./ast-circular-dependency-detector.error"
export {
    AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE,
    AstInterfaceContractValidatorError,
    type AstInterfaceContractValidatorErrorCode,
    type IAstInterfaceContractValidatorErrorDetails,
} from "./ast-interface-contract-validator.error"
export {
    AST_TYPE_FLOW_ANALYZER_ERROR_CODE,
    AstTypeFlowAnalyzerError,
    type AstTypeFlowAnalyzerErrorCode,
    type IAstTypeFlowAnalyzerErrorDetails,
} from "./ast-type-flow-analyzer.error"
export {
    AST_SHARED_STATE_DETECTOR_ERROR_CODE,
    AstSharedStateDetectorError,
    type AstSharedStateDetectorErrorCode,
    type IAstSharedStateDetectorErrorDetails,
} from "./ast-shared-state-detector.error"
export {
    AST_IMPACT_RADIUS_CALCULATOR_ERROR_CODE,
    AstImpactRadiusCalculatorError,
    type AstImpactRadiusCalculatorErrorCode,
    type IAstImpactRadiusCalculatorErrorDetails,
} from "./ast-impact-radius-calculator.error"
export {
    AST_CROSS_FILE_ISSUE_AGGREGATOR_ERROR_CODE,
    AstCrossFileIssueAggregatorError,
    type AstCrossFileIssueAggregatorErrorCode,
    type IAstCrossFileIssueAggregatorErrorDetails,
} from "./ast-cross-file-issue-aggregator.error"
export {
    AST_MONOREPO_PACKAGE_BOUNDARY_CHECKER_ERROR_CODE,
    AstMonorepoPackageBoundaryCheckerError,
    type AstMonorepoPackageBoundaryCheckerErrorCode,
    type IAstMonorepoPackageBoundaryCheckerErrorDetails,
} from "./ast-monorepo-package-boundary-checker.error"
export {
    AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE,
    AstApiSurfaceChangeDetectorError,
    type AstApiSurfaceChangeDetectorErrorCode,
    type IAstApiSurfaceChangeDetectorErrorDetails,
} from "./ast-api-surface-change-detector.error"
export {
    AST_PISCINA_WORKER_POOL_ERROR_CODE,
    AstPiscinaWorkerPoolError,
    type AstPiscinaWorkerPoolErrorCode,
    type IAstPiscinaWorkerPoolErrorDetails,
} from "./ast-piscina-worker-pool.error"
export {
    AST_CODE_CHUNK_EMBEDDING_GENERATOR_ERROR_CODE,
    AstCodeChunkEmbeddingGeneratorError,
    type AstCodeChunkEmbeddingGeneratorErrorCode,
    type IAstCodeChunkEmbeddingGeneratorErrorDetails,
} from "./ast-code-chunk-embedding-generator.error"
export {
    AstCodeChunkEmbeddingGenerator,
    type IAstCodeChunkEmbeddingGenerator,
    type IAstCodeChunkEmbeddingGeneratorOptions,
} from "./ast-code-chunk-embedding-generator"
export {
    AST_CODE_GRAPH_CLUSTERING_ERROR_CODE,
    AstCodeGraphClusteringError,
    type AstCodeGraphClusteringErrorCode,
    type IAstCodeGraphClusteringErrorDetails,
} from "./ast-code-graph-clustering.error"
export {
    AST_CODE_GRAPH_DIFF_ERROR_CODE,
    AstCodeGraphDiffError,
    type AstCodeGraphDiffErrorCode,
    type IAstCodeGraphDiffErrorDetails,
} from "./ast-code-graph-diff.error"
export {
    AST_CODE_GRAPH_IMPACT_ANALYSIS_ERROR_CODE,
    AstCodeGraphImpactAnalysisError,
    type AstCodeGraphImpactAnalysisErrorCode,
    type IAstCodeGraphImpactAnalysisErrorDetails,
} from "./ast-code-graph-impact-analysis.error"
export {
    AST_LANGUAGE_DETECTION_ERROR_CODE,
    AstLanguageDetectionError,
    type AstLanguageDetectionErrorCode,
    type IAstLanguageDetectionErrorDetails,
} from "./ast-language-detection.error"
export {
    AstLanguageDetectionService,
    type IAstLanguageDetectionInput,
    type IAstLanguageDetectionService,
} from "./ast-language-detection.service"
export {
    AST_CODE_GRAPH_BUILDER_ERROR_CODE,
    AstCodeGraphBuilderError,
    type AstCodeGraphBuilderErrorCode,
    type IAstCodeGraphBuilderErrorDetails,
} from "./ast-code-graph-builder.error"
export {
    AST_CODE_GRAPH_PAGE_RANK_ERROR_CODE,
    AstCodeGraphPageRankError,
    type AstCodeGraphPageRankErrorCode,
    type IAstCodeGraphPageRankErrorDetails,
} from "./ast-code-graph-page-rank.error"
export {
    AST_CODE_GRAPH_ENRICHER_ERROR_CODE,
    AstCodeGraphEnricherError,
    type AstCodeGraphEnricherErrorCode,
    type IAstCodeGraphEnricherErrorDetails,
} from "./ast-code-graph-enricher.error"
export {
    AstCodeGraphBuilder,
    type IAstCodeGraphBuilder,
    type IAstCodeGraphBuilderBuildInput,
    type IAstCodeGraphBuilderOptions,
    type IAstCodeGraphBuildResult,
} from "./ast-code-graph.builder"
export {
    AstCodeGraphEnricher,
    type IAstCodeGraphEnricher,
    type IAstCodeGraphEnrichmentInput,
    type IAstCodeGraphEnrichmentResult,
} from "./ast-code-graph.enricher"
export {
    AstCodeGraphClusteringService,
    type IAstCodeGraphClusteringServiceOptions,
} from "./ast-code-graph-clustering.service"
export {AstCodeGraphDiffService} from "./ast-code-graph-diff.service"
export {
    AstCodeGraphPageRankService,
    type IAstCodeGraphPageRankServiceOptions,
} from "./ast-code-graph-page-rank.service"
export {
    AST_ADVANCED_CODE_PATTERN_SEVERITY,
    AST_ADVANCED_CODE_PATTERN_TYPE,
    AstAdvancedCodeAnalysisService,
    type AstAdvancedCodePatternSeverity,
    type AstAdvancedCodePatternType,
    type IAstAdvancedCodeAnalysisInput,
    type IAstAdvancedCodeAnalysisResult,
    type IAstAdvancedCodeAnalysisService,
    type IAstAdvancedCodeAnalysisServiceOptions,
    type IAstAdvancedCodeAnalysisSummary,
    type IAstAdvancedCodePattern,
} from "./ast-advanced-code-analysis.service"
export {
    AstCodeDeduplicationService,
    type IAstCodeDeduplicationInput,
    type IAstCodeDeduplicationResult,
    type IAstCodeDeduplicationService,
    type IAstCodeDeduplicationServiceOptions,
    type IAstCodeDeduplicationSummary,
    type IAstCodeDuplicatePair,
} from "./ast-code-deduplication.service"
export {
    AST_SEMANTIC_MODULE_ROLE,
    AstSemanticCodeUnderstandingService,
    type AstSemanticModuleRole,
    type IAstSemanticCodeUnderstandingInput,
    type IAstSemanticCodeUnderstandingResult,
    type IAstSemanticCodeUnderstandingService,
    type IAstSemanticCodeUnderstandingServiceOptions,
    type IAstSemanticCodeUnderstandingSummary,
    type IAstSemanticModuleInsight,
    type IAstSemanticModuleMetrics,
} from "./ast-semantic-code-understanding.service"
export {
    AstCrossFileAnalyzer,
    type IAstCrossFileAnalysisContext,
    type IAstCrossFileAnalyzerFile,
    type IAstCrossFileAnalyzerInput,
} from "./ast-cross-file-analyzer"
export {
    AST_IMPORT_EXPORT_EDGE_TYPE,
    AstImportExportGraphBuilder,
    type AstImportExportEdgeType,
    type IAstImportExportGraphBuilder,
    type IAstImportExportGraphBuilderInput,
    type IAstImportExportGraphEdge,
    type IAstImportExportGraphResult,
    type IAstImportExportGraphSummary,
    type IAstUnresolvedImportExportReference,
} from "./ast-import-export-graph-builder"
export {
    AST_BREAKING_CHANGE_SEVERITY,
    AST_BREAKING_CHANGE_TYPE,
    AstBreakingChangeDetectorService,
    type AstBreakingChangeSeverity,
    type AstBreakingChangeType,
    type IAstBreakingChange,
    type IAstBreakingChangeDetectorInput,
    type IAstBreakingChangeDetectorResult,
    type IAstBreakingChangeDetectorService,
    type IAstBreakingChangeDetectorServiceOptions,
    type IAstBreakingChangeDetectorSummary,
} from "./ast-breaking-change-detector.service"
export {
    AST_CIRCULAR_DEPENDENCY_SEVERITY,
    AstCircularDependencyDetectorService,
    type AstCircularDependencySeverity,
    type IAstCircularDependency,
    type IAstCircularDependencyDetectorInput,
    type IAstCircularDependencyDetectorResult,
    type IAstCircularDependencyDetectorService,
    type IAstCircularDependencyDetectorServiceOptions,
    type IAstCircularDependencyDetectorSummary,
} from "./ast-circular-dependency-detector.service"
export {
    AST_INTERFACE_CONTRACT_DECLARATION_KIND,
    AST_INTERFACE_CONTRACT_ISSUE_SEVERITY,
    AST_INTERFACE_CONTRACT_ISSUE_TYPE,
    AstInterfaceContractValidatorService,
    type AstInterfaceContractDeclarationKind,
    type AstInterfaceContractIssueSeverity,
    type AstInterfaceContractIssueType,
    type IAstInterfaceContractIssue,
    type IAstInterfaceContractValidatorInput,
    type IAstInterfaceContractValidatorResult,
    type IAstInterfaceContractValidatorService,
    type IAstInterfaceContractValidatorServiceOptions,
    type IAstInterfaceContractValidatorSummary,
} from "./ast-interface-contract-validator.service"
export {
    AstTypeFlowAnalyzerService,
    type IAstTypeFlow,
    type IAstTypeFlowAnalyzerInput,
    type IAstTypeFlowAnalyzerResult,
    type IAstTypeFlowAnalyzerService,
    type IAstTypeFlowAnalyzerServiceOptions,
    type IAstTypeFlowAnalyzerSummary,
    type IAstUnresolvedTypeFlow,
} from "./ast-type-flow-analyzer.service"
export {
    AST_SHARED_STATE_ISSUE_TYPE,
    AST_SHARED_STATE_SEVERITY,
    AstSharedStateDetectorService,
    type AstSharedStateIssueType,
    type AstSharedStateSeverity,
    type IAstSharedStateDetectorInput,
    type IAstSharedStateDetectorResult,
    type IAstSharedStateDetectorService,
    type IAstSharedStateDetectorServiceOptions,
    type IAstSharedStateDetectorSummary,
    type IAstSharedStateIssue,
} from "./ast-shared-state-detector.service"
export {
    AST_IMPACT_RADIUS_DIRECTION,
    AstImpactRadiusCalculatorService,
    type AstImpactRadiusDirection,
    type IAstImpactedFile,
    type IAstImpactRadiusCalculatorInput,
    type IAstImpactRadiusCalculatorResult,
    type IAstImpactRadiusCalculatorService,
    type IAstImpactRadiusCalculatorServiceOptions,
    type IAstImpactRadiusCalculatorSummary,
} from "./ast-impact-radius-calculator.service"
export {
    AST_CROSS_FILE_ISSUE_SEVERITY,
    AST_CROSS_FILE_ISSUE_SOURCE,
    AstCrossFileIssueAggregatorService,
    type AstCrossFileIssueSeverity,
    type AstCrossFileIssueSource,
    type IAstCrossFileIssue,
    type IAstCrossFileIssueAggregatorInput,
    type IAstCrossFileIssueAggregatorResult,
    type IAstCrossFileIssueAggregatorService,
    type IAstCrossFileIssueAggregatorServiceOptions,
    type IAstCrossFileIssueAggregatorSummary,
    type IAstCrossFileIssueFileSummary,
    type IAstCrossFileIssueInput,
} from "./ast-cross-file-issue-aggregator.service"
export {
    AST_MONOREPO_BOUNDARY_VIOLATION_SEVERITY,
    AST_MONOREPO_BOUNDARY_VIOLATION_TYPE,
    AstMonorepoPackageBoundaryCheckerService,
    type AstMonorepoBoundaryViolationSeverity,
    type AstMonorepoBoundaryViolationType,
    type IAstMonorepoBoundaryViolation,
    type IAstMonorepoPackageBoundaryCheckerInput,
    type IAstMonorepoPackageBoundaryCheckerResult,
    type IAstMonorepoPackageBoundaryCheckerService,
    type IAstMonorepoPackageBoundaryCheckerServiceOptions,
    type IAstMonorepoPackageBoundaryCheckerSummary,
} from "./ast-monorepo-package-boundary-checker.service"
export {
    AST_API_SURFACE_CHANGE_SEVERITY,
    AST_API_SURFACE_CHANGE_TYPE,
    AstApiSurfaceChangeDetectorService,
    type AstApiSurfaceChangeSeverity,
    type AstApiSurfaceChangeType,
    type IAstApiSurfaceChange,
    type IAstApiSurfaceChangeDetectorInput,
    type IAstApiSurfaceChangeDetectorResult,
    type IAstApiSurfaceChangeDetectorService,
    type IAstApiSurfaceChangeDetectorServiceOptions,
    type IAstApiSurfaceChangeDetectorSummary,
} from "./ast-api-surface-change-detector.service"
export {
    AstPiscinaWorkerPoolService,
    type AstPiscinaWorkerPoolShouldRetry,
    type AstPiscinaWorkerPoolSleep,
    type IAstPiscinaWorkerPoolRetryPolicy,
    type IAstPiscinaWorkerPoolService,
    type IAstPiscinaWorkerPoolServiceOptions,
    type IAstPiscinaWorkerPoolStats,
    type IAstPiscinaWorkerPoolTaskRequest,
} from "./ast-piscina-worker-pool.service"
export {
    AstDependencyChainResolverService,
    type IAstDependencyChain,
    type IAstDependencyChainResolverInput,
    type IAstDependencyChainResolverResult,
    type IAstDependencyChainResolverService,
    type IAstDependencyChainResolverServiceOptions,
    type IAstDependencyChainResolverSummary,
} from "./ast-dependency-chain-resolver.service"
export {
    AST_CROSS_FILE_REFERENCE_TYPE,
    AstCrossFileReferenceResolutionService,
    type AstCrossFileReferenceType,
    type IAstCrossFileReference,
    type IAstCrossFileReferenceResolutionInput,
    type IAstCrossFileReferenceResolutionResult,
    type IAstCrossFileReferenceResolutionService,
    type IAstCrossFileReferenceResolutionServiceOptions,
    type IAstCrossFileReferenceResolutionSummary,
    type IAstUnresolvedCrossFileReference,
} from "./ast-cross-file-reference-resolution.service"
export {
    AST_CODE_GRAPH_IMPACT_ANALYSIS_DIRECTION,
    AstCodeGraphImpactAnalysisService,
    type AstCodeGraphImpactAnalysisDirection,
    type IAstCodeGraphImpactAnalysisInput,
    type IAstCodeGraphImpactAnalysisService,
    type IAstCodeGraphImpactAnalysisServiceOptions,
} from "./ast-code-graph-impact-analysis.service"
export {
    AST_CODE_GRAPH_REPOSITORY_ERROR_CODE,
    AstCodeGraphRepositoryError,
    type AstCodeGraphRepositoryErrorCode,
    type IAstCodeGraphRepositoryErrorDetails,
} from "./mongo-code-graph-repository.error"
export {
    MongoCodeGraphRepository,
    type IMongoCodeGraphCollection,
    type IMongoCodeGraphDocument,
    type IMongoCodeGraphRepositoryOptions,
} from "./mongo-code-graph.repository"
export {
    assertCSharpParserLanguage,
    CSharpSourceCodeParser,
    type CSharpParserLanguage,
    type ICSharpSourceCodeParserOptions,
} from "./csharp-source-code-parser"
export {
    assertGoParserLanguage,
    GoSourceCodeParser,
    type GoParserLanguage,
    type IGoSourceCodeParserOptions,
} from "./go-source-code-parser"
export {
    assertJavaParserLanguage,
    JavaSourceCodeParser,
    type IJavaSourceCodeParserOptions,
    type JavaParserLanguage,
} from "./java-source-code-parser"
export {
    assertKotlinParserLanguage,
    KotlinSourceCodeParser,
    type IKotlinSourceCodeParserOptions,
    type KotlinParserLanguage,
} from "./kotlin-source-code-parser"
export {
    assertPhpParserLanguage,
    PhpSourceCodeParser,
    type IPhpSourceCodeParserOptions,
    type PhpParserLanguage,
} from "./php-source-code-parser"
export {
    assertRubyParserLanguage,
    RubySourceCodeParser,
    type IRubySourceCodeParserOptions,
    type RubyParserLanguage,
} from "./ruby-source-code-parser"
export {
    assertRustParserLanguage,
    RustSourceCodeParser,
    type IRustSourceCodeParserOptions,
    type RustParserLanguage,
} from "./rust-source-code-parser"
export {
    assertJavaScriptParserLanguage,
    JavaScriptSourceCodeParser,
    type IJavaScriptSourceCodeParserOptions,
    type JavaScriptParserLanguage,
} from "./javascript-source-code-parser"
export {
    AST_PARSER_ERROR_CODE,
    AstParserError,
    type AstParserErrorCode,
    type IAstParserErrorDetails,
} from "./ast-parser.error"
export {
    AST_PARSER_FACTORY_ERROR_CODE,
    AstParserFactoryError,
    type AstParserFactoryErrorCode,
    type IAstParserFactoryErrorDetails,
} from "./ast-parser-factory.error"
export {
    AstParserFactory,
    type IAstParserFactory,
    type IAstParserFactoryOptions,
    normalizeAstParserLanguage,
} from "./ast-parser.factory"
export {BaseParser, type IBaseParserOptions} from "./base-parser"
export {
    assertPythonParserLanguage,
    PythonSourceCodeParser,
    type IPythonSourceCodeParserOptions,
    type PythonParserLanguage,
} from "./python-source-code-parser"
export {
    assertTypeScriptParserLanguage,
    TypeScriptSourceCodeParser,
    type ITypeScriptSourceCodeParserOptions,
    type TypeScriptParserLanguage,
} from "./typescript-source-code-parser"
