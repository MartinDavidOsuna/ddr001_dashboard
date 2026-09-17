// Generated from functional diagnostics SQL column projection at API e571b8bdf84a709a0d4ce40bf2a5f842e44199bd.
// The admin repository converts snake_case to camelCase, excluding storage keys, payload hash and row version.
export type Numeric = number | string;

export interface CaseRecord extends Record<string, unknown> {
  caseId: string;
  meterId: string;
  userId: string;
  clientUserId: string;
  status: string;
  overallVerdict: string | null;
  reportVersion: number;
  testBenchId: string;
  sourceInstallationId: string | null;
  sourceDeviceId: string | null;
  sourceAndroidVersion: string | null;
  sourceDeviceBrand: string | null;
  sourceDeviceModel: string | null;
  clientCreatedAt: string;
  clientClosedAt: string | null;
  checksum: string | null;
  canonicalVersion: number | null;
  contractVersion: string;
  serverCreatedAt: string;
  serverUpdatedAt: string;
}

export interface FlowRecord extends Record<string, unknown> {
  flowPointId: string;
  caseId: string;
  code: string;
  lpsApprox: Numeric | null;
  mpePct: Numeric;
  status: string;
  statisticsN: number | null;
  meanErrorPct: Numeric | null;
  minimumErrorPct: Numeric | null;
  maximumErrorPct: Numeric | null;
  dispersionPct: Numeric | null;
  sampleStddevPct: Numeric | null;
  repeatabilityStatus: string | null;
  clientCreatedAt: string;
  serverCreatedAt: string;
  serverUpdatedAt: string;
}

export interface SampleRecord extends Record<string, unknown> {
  sampleId: string;
  flowPointId: string;
  sampleNumber: number;
  status: string;
  measurementSource: string;
  isSimulation: boolean;
  simulationScenario: string | null;
  clientCreatedAt: string;
  clientUpdatedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  gpsLatitude: Numeric | null;
  gpsLongitude: Numeric | null;
  gpsAccuracyM: Numeric | null;
  gpsCapturedAt: string | null;
  pulseCount: Numeric;
  progressReferenceL: Numeric | null;
  initialOdometerUnits: Numeric | null;
  initialNeedleL: Numeric | null;
  initialReadingSource: string | null;
  initialEvidenceId: string | null;
  finalOdometerUnits: Numeric | null;
  finalNeedleL: Numeric | null;
  finalReadingSource: string | null;
  finalEvidenceId: string | null;
  vRefL: Numeric | null;
  vIndL: Numeric | null;
  errorPct: Numeric | null;
  uncertaintyPct: Numeric | null;
  resultMpePct: Numeric | null;
  acceptanceMetricPct: Numeric | null;
  rejectionMetricPct: Numeric | null;
  verdict: string | null;
  acquisitionIntegrityStatus: string;
  acquisitionIntegrityReason: string | null;
  acquisitionIntegrityAt: string | null;
  acquisitionIntegritySource: string | null;
  checksum: string | null;
  canonicalVersion: number | null;
  algorithmVersion: string | null;
  contractVersion: string;
  serverCreatedAt: string;
}

export interface SettingsRecord extends Record<string, unknown> {
  sampleId: string;
  litersPerPulse: Numeric;
  evidenceStepL: Numeric;
  readingUncertaintyL: Numeric;
  flowPointCode: string;
  configuredMpePct: Numeric;
  lpsApprox: Numeric | null;
  litersPerOdometerUnit: Numeric;
  needleLitersPerRevolution: Numeric;
  minimumVolumeL: Numeric | null;
  maximumVolumeL: Numeric | null;
  controlStartMinimumLps: Numeric | null;
  controlStartMaximumLps: Numeric | null;
  hydrantLitersPerPulse: Numeric | null;
  cameraZoomLevel: Numeric | null;
  totalizerLeft: Numeric | null;
  totalizerTop: Numeric | null;
  totalizerWidth: Numeric | null;
  totalizerHeight: Numeric | null;
  dialCenterX: Numeric | null;
  dialCenterY: Numeric | null;
  dialRadius: Numeric | null;
  dialMultiplier: Numeric | null;
  dialLitersPerRevolution: Numeric | null;
  dialZeroAngleDegrees: Numeric | null;
  dialClockwise: boolean | null;
  dialConfigurationSource: string | null;
  totalizerDigitCount: number | null;
  totalizerDecimalPlaces: number | null;
  totalizerUnit: string | null;
  totalizerLeadingZerosAllowed: boolean | null;
  totalizerConfigurationSource: string | null;
  bleDeviceId: string | null;
  bleDeviceName: string | null;
  bleServiceUuid: string | null;
  bleCounterCharacteristicUuid: string | null;
  bleProtocolVersion: number | null;
  esp32CounterAtStart: Numeric | null;
  lastObservedEsp32Counter: Numeric | null;
  ledRoiLeft: Numeric | null;
  ledRoiTop: Numeric | null;
  ledRoiWidth: Numeric | null;
  ledRoiHeight: Numeric | null;
  ledRisingDelta: Numeric | null;
  ledFallingDelta: Numeric | null;
  ledBaseline: Numeric | null;
  ledMinPulseIntervalMs: number | null;
  ledUsesBleReconciliation: boolean | null;
}

export interface PointRecord extends Record<string, unknown> {
  pointId: string;
  sampleId: string;
  type: string;
  pulseCount: Numeric | null;
  meterUnderTestPulseCount: Numeric | null;
  vRefL: Numeric | null;
  readingL: Numeric | null;
  vIndL: Numeric | null;
  diagnosticErrorPct: Numeric | null;
  needleL: Numeric | null;
  flowLps: Numeric | null;
  capturedAt: string;
}
