/** Contract v1: API 665f747, rv-analytics.ts and docs/openapi.yaml. */
export interface AnalyticsQuery {
  mode: 'current' | 'history'; grain: 'day' | 'week' | 'month';
  from?: string; to?: string; userId?: string; crewId?: string;
  status?: 'submitted' | 'validated' | 'inactive';
}
export interface RvAnalyticsScope extends Omit<AnalyticsQuery, 'from' | 'to' | 'userId' | 'crewId' | 'status'> {
  from: string | null; to: string | null; userId: string | null; crewId: string | null; status: string | null;
  timezone: 'America/Hermosillo'; generatedAt: string; observationUnit: 'hydrants' | 'inspections'; maxInspections: number;
}
export interface RvAnalyticsSummary {
 selectedInspections: number; selectedHydrants: number; evaluatedHydrants: number; hydrantsWithFindings: number;
 hydrantsWithoutFindings: number; findingCount: number; inactiveHydrants: number; noEvaluableDataHydrants: number;
 catalogHydrants: number; coveragePercent: number;
}
export interface RvAnalyticsMetric {
 code: string; itemCode: string; label: string; system: string; description: string; affectedValue: 'true' | 'false' | 'undefined';
 kind: 'physical' | 'quality'; unit: 'hydrants' | 'inspections'; affected: number; evaluated: number; percentage: number;
 notApplicable: number; noData: number; unavailable: number;
}
export interface RvSystemAnalytics { system: string; hydrantsEvaluated: number; hydrantsAffected: number; findingCount: number; percentageAffected: number }
export interface RvDistributionValue { key: string; label: string; count: number; percentage: number }
export interface RvDistribution { code: string; itemCode: string; label: string; unit: 'hydrants' | 'inspections'; denominator: number; values: RvDistributionValue[] }
export interface RvTrendPoint { date: string; inspections: number; hydrants: number; evaluated: number; affected: number; percentageAffected: number }
export interface RvDataQuality {
 withoutGps: number; withoutSignal: number; missingIndicatorObservations: number; applicableRequiredFieldsWithoutData: number;
 inactiveInspections: number; indicators: RvAnalyticsMetric[];
 photoIntegrity: { uploadStatus: string; integrityStatus: string | null; mappingStatus: string | null; integrityVerified: boolean; count: number }[];
 requiredEvidence: { complete: number; incomplete: number; indeterminate: number; baseComplete: number; baseIncomplete: number };
}
export interface RvParcelValveAnalytics {
 configurations: { key: string; count: number; configuredValves: number }[];
 components: { observedValves: number; withoutSolenoid: number; withoutPilot: number; withoutGauge: number; disconnectedPilots: number };
 distributions: { code: string; unit: 'components'; denominator: number; values: Omit<RvDistributionValue, 'label'>[] }[];
}
export interface RvAnalyticsResponse {
 contractVersion: 1; scope: RvAnalyticsScope; summary: RvAnalyticsSummary; findings: RvAnalyticsMetric[];
 pareto: (RvAnalyticsMetric & { cumulativeAffected: number; cumulativePercentage: number })[];
 systems: RvSystemAnalytics[]; distributions: RvDistribution[]; trend: RvTrendPoint[]; dataQuality: RvDataQuality; parcelValves: RvParcelValveAnalytics;
}
