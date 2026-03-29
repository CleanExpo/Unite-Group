/**
 * Quantum Computing Foundation Types
 * Unite Group - Version 15.0 Phase 1 Implementation
 */

// Core Quantum Computing Types
export interface QuantumProcessor {
  quantumOptimization: QuantumOptimizationEngine;
  hybridMLPipeline: QuantumClassicalMLFramework;
  quantumSafeEncryption: PostQuantumCryptography;
  realTimeQuantumProcessing: QuantumStreamProcessor;
}

export interface QuantumStreamProcessor {
  id: string;
  isActive: boolean;
  streamingRate: number;
  bufferSize: number;
  processingLatency: number;
  throughput: number;
}

export interface PostQuantumCryptography {
  algorithms: string[];
  keySize: number;
  encryptionMethod: string;
  securityLevel: number;
}

export interface QuantumOptimizationEngine {
  // Optimization Problem Types
  solveOptimizationProblem(problem: OptimizationProblem): Promise<QuantumOptimizationResult>;
  validateQuantumAdvantage(problem: OptimizationProblem): Promise<QuantumAdvantageAnalysis>;
  optimizeBusinessProcesses(processes: BusinessProcess[]): Promise<ProcessOptimizationResult>;
  performPortfolioOptimization(portfolio: InvestmentPortfolio): Promise<PortfolioOptimizationResult>;
  
  // Real-time Optimization
  enableRealTimeOptimization(constraints: OptimizationConstraints): Promise<RealTimeOptimizer>;
  monitorOptimizationPerformance(): Promise<OptimizationMetrics>;
  adaptOptimizationStrategy(feedback: OptimizationFeedback): Promise<StrategyAdaptation>;
}

export interface OptimizationProblem {
  type: OptimizationProblemType;
  variables: OptimizationVariable[];
  constraints: OptimizationConstraint[];
  objectiveFunction: ObjectiveFunction;
  complexity: ProblemComplexity;
  quantumAdvantageExpected: boolean;
  timeoutMs: number;
}

export type OptimizationProblemType = 
  | 'quadratic_unconstrained_binary'
  | 'traveling_salesman'
  | 'portfolio_optimization'
  | 'scheduling_optimization'
  | 'resource_allocation'
  | 'network_optimization'
  | 'supply_chain_optimization'
  | 'financial_risk_optimization';

export interface OptimizationVariable {
  name: string;
  type: 'binary' | 'integer' | 'continuous' | 'categorical';
  domain: VariableDomain;
  weight: number;
  constraints: VariableConstraint[];
}

export interface VariableDomain {
  min?: number;
  max?: number;
  discrete_values?: any[];
  probability_distribution?: ProbabilityDistribution;
}

export interface ProbabilityDistribution {
  type: 'uniform' | 'normal' | 'exponential' | 'custom';
  parameters: Record<string, number>;
}

export interface VariableConstraint {
  type: 'equality' | 'inequality' | 'bound' | 'logical';
  expression: string;
  tolerance: number;
}

export interface OptimizationConstraint {
  id: string;
  type: ConstraintType;
  variables: string[];
  expression: string;
  priority: ConstraintPriority;
  feasibilityTolerance: number;
}

export type ConstraintType = 
  | 'linear_equality'
  | 'linear_inequality'
  | 'quadratic_equality'
  | 'quadratic_inequality'
  | 'integer_constraint'
  | 'cardinality_constraint'
  | 'logical_constraint';

export type ConstraintPriority = 'hard' | 'soft' | 'preference' | 'goal';

export interface ObjectiveFunction {
  type: 'minimize' | 'maximize' | 'multi_objective';
  expression: string;
  weight: number;
  quantumSpeedupExpected: boolean;
  classicalBenchmark?: ClassicalBenchmark;
}

export interface ClassicalBenchmark {
  algorithm: string;
  timeComplexity: string;
  spaceComplexity: string;
  expectedRuntime: number;
  accuracy: number;
}

export type ProblemComplexity = 
  | 'polynomial'
  | 'np_complete'
  | 'np_hard'
  | 'pspace_complete'
  | 'exponential'
  | 'intractable';

// Business Process Types
export interface BusinessProcess {
  id: string;
  name: string;
  description: string;
  steps: ProcessStep[];
  resources: ProcessResource[];
  constraints: ProcessConstraint[];
  objectives: ProcessObjective[];
}

export interface ProcessStep {
  id: string;
  name: string;
  duration: number;
  dependencies: string[];
  resources: string[];
}

export interface ProcessResource {
  id: string;
  type: string;
  capacity: number;
  cost: number;
  availability: TimeWindow[];
}

export interface TimeWindow {
  start: Date;
  end: Date;
  available: boolean;
}

export interface ProcessConstraint {
  id: string;
  type: string;
  expression: string;
  violation_penalty: number;
}

export interface ProcessObjective {
  id: string;
  type: 'minimize_time' | 'minimize_cost' | 'maximize_quality' | 'maximize_throughput';
  weight: number;
  target?: number;
}

export interface ProcessOptimizationResult {
  processId: string;
  optimizedSchedule: OptimizedSchedule;
  resourceAllocation: ResourceAllocation[];
  performance: ProcessPerformance;
  feasibility: FeasibilityAnalysis;
}

export interface OptimizedSchedule {
  steps: ScheduledStep[];
  totalDuration: number;
  criticalPath: string[];
  slackTime: Record<string, number>;
}

export interface ScheduledStep {
  stepId: string;
  startTime: Date;
  endTime: Date;
  assignedResources: string[];
  dependencies: string[];
}

export interface ResourceAllocation {
  resourceId: string;
  utilization: number;
  assignments: ResourceAssignment[];
  capacity_utilization: number;
}

export interface ResourceAssignment {
  stepId: string;
  startTime: Date;
  endTime: Date;
  allocation: number;
}

export interface ProcessPerformance {
  throughput: number;
  efficiency: number;
  qualityScore: number;
  costEffectiveness: number;
  bottlenecks: Bottleneck[];
}

export interface Bottleneck {
  stepId: string;
  severity: number;
  impact: number;
  mitigation: string[];
}

export interface FeasibilityAnalysis {
  feasible: boolean;
  violations: ConstraintViolation[];
  recommendations: string[];
  alternativeOptions: AlternativeOption[];
}

export interface ConstraintViolation {
  constraintId: string;
  severity: number;
  description: string;
  suggestedResolution: string;
}

export interface AlternativeOption {
  description: string;
  impact: PerformanceImpact;
  implementationCost: number;
  timeToImplement: number;
}

export interface PerformanceImpact {
  throughputChange: number;
  costChange: number;
  qualityChange: number;
  riskChange: number;
}

// Investment Portfolio Types
export interface InvestmentPortfolio {
  id: string;
  assets: Asset[];
  constraints: PortfolioConstraint[];
  objectives: InvestmentObjective[];
  riskProfile: RiskProfile;
  timeHorizon: number;
}

export interface Asset {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  expectedReturn: number;
  volatility: number;
  correlations: Record<string, number>;
  marketCap?: number;
  beta?: number;
  dividendYield?: number;
}

export type AssetClass = 'equity' | 'fixed_income' | 'commodity' | 'real_estate' | 'alternative' | 'cash';

export interface PortfolioConstraint {
  type: PortfolioConstraintType;
  target?: number;
  min?: number;
  max?: number;
  assets?: string[];
}

export type PortfolioConstraintType = 
  | 'weight_limit'
  | 'sector_allocation'
  | 'asset_class_allocation'
  | 'turnover_limit'
  | 'liquidity_requirement'
  | 'esg_score';

export interface InvestmentObjective {
  type: InvestmentObjectiveType;
  weight: number;
  target?: number;
  benchmark?: string;
}

export type InvestmentObjectiveType = 
  | 'maximize_return'
  | 'minimize_risk'
  | 'maximize_sharpe_ratio'
  | 'track_benchmark'
  | 'minimize_tracking_error';

export interface RiskProfile {
  tolerance: RiskTolerance;
  measures: RiskMeasure[];
  constraints: RiskConstraint[];
}

export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive' | 'very_aggressive';

export interface RiskMeasure {
  type: RiskMeasureType;
  value: number;
  timeHorizon: number;
  confidence: number;
}

export type RiskMeasureType = 'var' | 'cvar' | 'maximum_drawdown' | 'volatility' | 'beta' | 'tracking_error';

export interface RiskConstraint {
  measure: RiskMeasureType;
  limit: number;
  timeframe: number;
}

export interface PortfolioOptimizationResult {
  portfolioId: string;
  optimizedWeights: AssetWeight[];
  expectedPerformance: PortfolioPerformance;
  riskMetrics: PortfolioRiskMetrics;
  analysis: PortfolioAnalysis;
}

export interface AssetWeight {
  symbol: string;
  weight: number;
  allocation: number;
  contribution: AssetContribution;
}

export interface AssetContribution {
  returnContribution: number;
  riskContribution: number;
  diversificationRatio: number;
}

export interface PortfolioPerformance {
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  informationRatio: number;
  calmarRatio: number;
}

export interface PortfolioRiskMetrics {
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  maxDrawdown: number;
  beta: number;
  trackingError?: number;
}

export interface PortfolioAnalysis {
  efficientFrontier: EfficientFrontierPoint[];
  assetAllocation: AllocationBreakdown;
  riskAttribution: RiskAttribution[];
  sensitivity: PortfolioSensitivity;
}

export interface EfficientFrontierPoint {
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  weights: Record<string, number>;
}

export interface AllocationBreakdown {
  byAssetClass: Record<AssetClass, number>;
  bySector?: Record<string, number>;
  byRegion?: Record<string, number>;
  byMarketCap?: Record<string, number>;
}

export interface RiskAttribution {
  source: string;
  contribution: number;
  percentage: number;
}

export interface PortfolioSensitivity {
  interestRateSensitivity: number;
  currencySensitivity: Record<string, number>;
  inflationSensitivity: number;
  marketSensitivity: number;
}

// Additional required types
export interface OptimizationConstraints {
  timeLimit: number;
  resourceLimit: ResourceLimit;
  qualityRequirements: QualityRequirement[];
  businessRules: BusinessRule[];
}

export interface ResourceLimit {
  maxMemory: number;
  maxCpu: number;
  maxQuantumResources: number;
}

export interface QualityRequirement {
  metric: string;
  threshold: number;
  priority: number;
}

export interface BusinessRule {
  id: string;
  description: string;
  type: 'hard' | 'soft';
  expression: string;
}

export interface RealTimeOptimizer {
  id: string;
  isActive: boolean;
  updateFrequency: number;
  adaptationRate: number;
}

export interface OptimizationMetrics {
  convergenceRate: number;
  solutionStability: number;
  resourceUtilization: number;
  performance: number;
}

export interface OptimizationFeedback {
  solutionQuality: number;
  userSatisfaction: number;
  performanceMetrics: Record<string, number>;
  suggestions: string[];
}

export interface StrategyAdaptation {
  adaptationRequired: boolean;
  recommendedChanges: ParameterChange[];
  expectedImprovement: number;
  implementationRisk: number;
}

export interface ParameterChange {
  parameter: string;
  currentValue: any;
  recommendedValue: any;
  confidence: number;
}

export interface QuantumOptimizationResult {
  solutionId: string;
  timestamp: string;
  problem: OptimizationProblem;
  solution: OptimizationSolution;
  performance: QuantumPerformanceMetrics;
  quantumAdvantage: QuantumAdvantageAnalysis;
  confidence: ConfidenceMetrics;
  validation: SolutionValidation;
  convergence: number;
}

export interface OptimizationSolution {
  variableAssignments: VariableAssignment[];
  objectiveValue: number;
  feasible: boolean;
  optimal: boolean;
  solutionQuality: SolutionQuality;
  alternativeSolutions: AlternativeSolution[];
}

export interface VariableAssignment {
  variableName: string;
  value: any;
  confidence: number;
  quantumContribution: number;
}

export interface SolutionQuality {
  optimality: number;
  feasibility: number;
  robustness: number;
  sensitivity: SensitivityAnalysis;
}

export interface SensitivityAnalysis {
  parameterSensitivity: ParameterSensitivity[];
  constraintSensitivity: ConstraintSensitivity[];
  objectiveSensitivity: number;
}

export interface ParameterSensitivity {
  parameter: string;
  sensitivity: number;
  impactOnSolution: number;
  criticalThreshold: number;
}

export interface ConstraintSensitivity {
  constraintId: string;
  shadowPrice: number;
  rightHandSideRange: Range;
  bindingStatus: 'binding' | 'non_binding' | 'redundant';
}

export interface Range {
  min: number;
  max: number;
  current: number;
}

export interface AlternativeSolution {
  rank: number;
  objectiveValue: number;
  variableAssignments: VariableAssignment[];
  diversityScore: number;
  tradeoffAnalysis: TradeoffAnalysis;
}

export interface TradeoffAnalysis {
  objectiveTradeoffs: ObjectiveTradeoff[];
  constraintRelaxation: ConstraintRelaxation[];
  riskReturn: RiskReturnProfile;
}

export interface ObjectiveTradeoff {
  objective1: string;
  objective2: string;
  tradeoffRatio: number;
  paretoEfficient: boolean;
}

export interface ConstraintRelaxation {
  constraintId: string;
  relaxationAmount: number;
  impactOnObjective: number;
  feasibilityImpact: number;
}

export interface RiskReturnProfile {
  expectedReturn: number;
  risk: number;
  sharpeRatio: number;
  valueAtRisk: number;
}

export interface QuantumPerformanceMetrics {
  executionTime: ExecutionTimeMetrics;
  quantumResourceUsage: QuantumResourceUsage;
  speedupMetrics: SpeedupMetrics;
  accuracyMetrics: AccuracyMetrics;
  scalabilityMetrics: ScalabilityMetrics;
}

export interface ExecutionTimeMetrics {
  totalTime: number;
  quantumProcessingTime: number;
  classicalProcessingTime: number;
  communicationOverhead: number;
  optimizationTime: number;
}

export interface QuantumResourceUsage {
  qubitsUsed: number;
  quantumGates: number;
  circuitDepth: number;
  quantumVolume: number;
  coherenceTime: number;
  errorRate: number;
}

export interface SpeedupMetrics {
  quantumSpeedup: number;
  theoreticalSpeedup: number;
  practicalSpeedup: number;
  speedupVariance: number;
  scalingBehavior: SpeedupScaling;
}

export interface SpeedupScaling {
  problemSizeScaling: ScalingFunction;
  quantumResourceScaling: ScalingFunction;
  hybridScaling: ScalingFunction;
}

export interface ScalingFunction {
  function: string;
  parameters: number[];
  goodnessFit: number;
  confidenceInterval: Range;
}

export interface AccuracyMetrics {
  solutionAccuracy: number;
  quantumErrorRate: number;
  classicalErrorRate: number;
  hybridErrorRate: number;
  errorCorrection: ErrorCorrectionMetrics;
}

export interface ErrorCorrectionMetrics {
  logicalErrorRate: number;
  physicalErrorRate: number;
  correctionOverhead: number;
  thresholdAchieved: boolean;
}

export interface ScalabilityMetrics {
  maxProblemSize: number;
  resourceScaling: ResourceScaling;
  performanceScaling: PerformanceScaling;
  limitingFactors: LimitingFactor[];
}

export interface ResourceScaling {
  qubitScaling: ScalingFunction;
  timeScaling: ScalingFunction;
  memoryScaling: ScalingFunction;
}

export interface PerformanceScaling {
  speedupScaling: ScalingFunction;
  accuracyScaling: ScalingFunction;
  reliabilityScaling: ScalingFunction;
}

export interface LimitingFactor {
  factor: 'qubit_count' | 'coherence_time' | 'gate_fidelity' | 'connectivity' | 'classical_overhead';
  impact: number;
  mitigation: string;
}

export interface QuantumAdvantageAnalysis {
  advantageAchieved: boolean;
  advantageType: QuantumAdvantageType;
  advantageMagnitude: number;
  confidenceLevel: number;
  comparisonBenchmarks: BenchmarkComparison[];
  advantageStability: AdvantageStability;
}

export type QuantumAdvantageType = 
  | 'computational_speedup'
  | 'solution_quality'
  | 'resource_efficiency'
  | 'noise_resilience'
  | 'hybrid_advantage';

export interface BenchmarkComparison {
  algorithm: string;
  classicalTime: number;
  quantumTime: number;
  speedupRatio: number;
  qualityComparison: QualityComparison;
}

export interface QualityComparison {
  classicalQuality: number;
  quantumQuality: number;
  qualityImprovement: number;
  statisticalSignificance: number;
}

export interface AdvantageStability {
  stability: number;
  varianceAcrossRuns: number;
  robustnessToNoise: number;
  scalingStability: number;
}

export interface ConfidenceMetrics {
  overallConfidence: number;
  solutionConfidence: number;
  performanceConfidence: number;
  advantageConfidence: number;
  uncertaintyQuantification: UncertaintyQuantification;
}

export interface UncertaintyQuantification {
  epistemic: number;
  aleatory: number;
  model: number;
  measurement: number;
}

export interface SolutionValidation {
  validationMethod: ValidationMethod[];
  crossValidation: CrossValidationResult;
  robustnessTest: RobustnessTestResult;
  benchmarkValidation: BenchmarkValidationResult;
}

export interface ValidationMethod {
  method: 'analytical' | 'simulation' | 'empirical' | 'cross_validation' | 'bootstrap';
  confidence: number;
  result: 'valid' | 'invalid' | 'uncertain';
}

export interface CrossValidationResult {
  folds: number;
  averagePerformance: number;
  standardDeviation: number;
  consistency: number;
}

export interface RobustnessTestResult {
  parameterPerturbation: PerturbationTest[];
  noiseTolerance: NoiseToleranceTest;
  outlierResistance: OutlierResistanceTest;
}

export interface PerturbationTest {
  parameter: string;
  perturbationRange: Range;
  solutionStability: number;
  performanceImpact: number;
}

export interface NoiseToleranceTest {
  noiseLevel: number;
  performanceDegradation: number;
  errorThreshold: number;
  recoveryCapability: number;
}

export interface OutlierResistanceTest {
  outlierRatio: number;
  solutionRobustness: number;
  detectionCapability: number;
  mitigationEffectiveness: number;
}

export interface BenchmarkValidationResult {
  industryBenchmarks: IndustryBenchmark[];
  academicBenchmarks: AcademicBenchmark[];
  comparativePerformance: ComparativePerformance;
}

export interface IndustryBenchmark {
  benchmark: string;
  performance: number;
  ranking: number;
  industryStandard: boolean;
}

export interface AcademicBenchmark {
  benchmark: string;
  publication: string;
  performance: number;
  reproducibility: number;
}

export interface ComparativePerformance {
  relativePerformance: number;
  competitiveAdvantage: number;
  performanceGap: number;
  improvementPotential: number;
}

// Quantum-Classical ML Framework
export interface QuantumClassicalMLFramework {
  hybridModels: HybridMLModel[];
  quantumFeatureMap: QuantumFeatureMap;
  classicalOptimizer: ClassicalOptimizer;
  quantumVariationalCircuit: QuantumVariationalCircuit;
  performanceAnalytics: MLPerformanceAnalytics;
}

export interface HybridMLModel {
  modelId: string;
  type: HybridModelType;
  quantumLayers: QuantumLayer[];
  classicalLayers: ClassicalLayer[];
  trainingStrategy: TrainingStrategy;
  performance: ModelPerformance;
}

export type HybridModelType = 
  | 'quantum_neural_network'
  | 'variational_classifier'
  | 'quantum_convolutional'
  | 'quantum_recurrent'
  | 'quantum_transformer'
  | 'quantum_gnn';

export interface QuantumLayer {
  layerId: string;
  type: QuantumLayerType;
  qubits: number;
  parameters: QuantumParameter[];
  circuit: QuantumCircuit;
  entanglement: EntanglementPattern;
}

export type QuantumLayerType = 
  | 'parameterized_circuit'
  | 'quantum_convolution'
  | 'quantum_pooling'
  | 'quantum_attention'
  | 'quantum_embedding';

export interface QuantumParameter {
  name: string;
  value: number;
  gradient: number;
  learningRate: number;
  regularization: number;
}

export interface QuantumCircuit {
  circuitId: string;
  gates: QuantumGate[];
  depth: number;
  width: number;
  fidelity: number;
}

export interface QuantumGate {
  type: QuantumGateType;
  qubits: number[];
  parameters: number[];
  duration: number;
  errorRate: number;
}

export type QuantumGateType = 
  | 'hadamard'
  | 'pauli_x'
  | 'pauli_y'
  | 'pauli_z'
  | 'rotation_x'
  | 'rotation_y'
  | 'rotation_z'
  | 'cnot'
  | 'controlled_z'
  | 'toffoli'
  | 'phase'
  | 'swap'
  | 'fredkin';

export interface EntanglementPattern {
  type: EntanglementType;
  connectivity: ConnectivityGraph;
  depth: number;
  strength: number;
}

export type EntanglementType = 
  | 'linear'
  | 'circular'
  | 'star'
  | 'complete'
  | 'random'
  | 'hardware_native';

export interface ConnectivityGraph {
  nodes: number[];
  edges: GraphEdge[];
  connectivity: number;
  diameter: number;
}

export interface GraphEdge {
  source: number;
  target: number;
  weight: number;
  fidelity: number;
}

export interface ClassicalLayer {
  layerId: string;
  type: ClassicalLayerType;
  neurons: number;
  activation: ActivationFunction;
  parameters: ClassicalParameter[];
}

export type ClassicalLayerType = 
  | 'dense'
  | 'convolutional'
  | 'recurrent'
  | 'attention'
  | 'normalization'
  | 'dropout';

export interface ClassicalParameter {
  name: string;
  shape: number[];
  value: number[];
  gradient: number[];
  optimizer: OptimizerState;
}

export interface OptimizerState {
  type: 'adam' | 'sgd' | 'rmsprop' | 'adagrad';
  learningRate: number;
  momentum: number;
  beta1?: number;
  beta2?: number;
  epsilon?: number;
}

export interface ActivationFunction {
  type: 'relu' | 'sigmoid' | 'tanh' | 'softmax' | 'gelu' | 'swish';
  parameters: number[];
}

export interface TrainingStrategy {
  type: TrainingStrategyType;
  epochs: number;
  batchSize: number;
  optimizationSchedule: OptimizationSchedule;
  regularization: RegularizationConfig;
  validation: ValidationConfig;
}

export type TrainingStrategyType = 
  | 'end_to_end'
  | 'alternating'
  | 'staged'
  | 'transfer_learning'
  | 'meta_learning';

export interface OptimizationSchedule {
  quantumSteps: number;
  classicalSteps: number;
  schedulingStrategy: 'fixed' | 'adaptive' | 'dynamic';
  convergenceCriteria: ConvergenceCriteria;
}

export interface ConvergenceCriteria {
  lossTolerance: number;
  gradientTolerance: number;
  maxIterations: number;
  plateauPatience: number;
}

export interface RegularizationConfig {
  l1Regularization: number;
  l2Regularization: number;
  dropout: number;
  quantumNoise: QuantumNoiseConfig;
}

export interface QuantumNoiseConfig {
  depolarizing: number;
  amplitude_damping: number;
  phase_damping: number;
  thermal: number;
}

export interface ValidationConfig {
  strategy: 'holdout' | 'k_fold' | 'time_series' | 'stratified';
  splitRatio: number;
  folds?: number;
  shuffling: boolean;
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  quantumContribution: QuantumContribution;
  trainingMetrics: TrainingMetrics;
}

export interface QuantumContribution {
  informationGain: number;
  expressivity: number;
  generalization: number;
  noiseResilience: number;
}

export interface TrainingMetrics {
  convergenceTime: number;
  finalLoss: number;
  gradientNorm: number;
  parameterUpdates: number;
  quantumCircuitCalls: number;
}

export interface QuantumFeatureMap {
  encoding: FeatureEncodingType;
  dimension: number;
  entanglement: EntanglementPattern;
  repetitions: number;
  dataReuploading: boolean;
}

export type FeatureEncodingType = 
  | 'amplitude_encoding'
  | 'angle_encoding'
  | 'basis_encoding'
  | 'dense_angle_encoding'
  | 'iqp_encoding';

export interface ClassicalOptimizer {
  type: 'adam' | 'lbfgs' | 'cobyla' | 'spsa' | 'nesterov';
  hyperparameters: OptimizerHyperparameters;
  adaptiveScheduling: boolean;
  convergenceMonitoring: ConvergenceMonitoring;
}

export interface OptimizerHyperparameters {
  learningRate: number;
  momentum?: number;
  beta1?: number;
  beta2?: number;
  epsilon?: number;
  weightDecay?: number;
}

export interface ConvergenceMonitoring {
  patience: number;
  toleranceThreshold: number;
  improvementThreshold: number;
  earlyStoppingEnabled: boolean;
}

export interface QuantumVariationalCircuit {
  layers: VariationalLayer[];
  parameterCount: number;
  circuitDepth: number;
  expressivity: ExpressivityMetrics;
  trainability: TrainabilityMetrics;
}

export interface VariationalLayer {
  layerType: 'rotation' | 'entangling' | 'data_encoding' | 'measurement';
  qubits: number[];
  parameters: VariationalParameter[];
  gates: QuantumGate[];
}

export interface VariationalParameter {
  parameterId: string;
  initialValue: number;
  bounds: Range;
  learningRate: number;
  gradientClipping: number;
}

export interface ExpressivityMetrics {
  meyer_wallach_measure: number;
  expressivity_score: number;
  entanglement_capability: number;
  parameter_efficiency: number;
}

export interface TrainabilityMetrics {
  gradient_variance: number;
  barren_plateau_susceptibility: number;
  parameter_concentration: number;
  optimization_landscape: LandscapeMetrics;
}

export interface LandscapeMetrics {
  local_minima_count: number;
  global_minimum_reachability: number;
  gradient_magnitude_statistics: StatisticalMetrics;}

export interface StatisticalMetrics {
  mean: number;
  variance: number;
  std_deviation: number;
  min: number;
  max: number;
}

export interface MLPerformanceAnalytics {
  training_accuracy: number;
  validation_accuracy: number;
  test_accuracy: number;
  loss_history: number[];
  convergence_epoch: number;
  quantum_advantage_score: number;
}
