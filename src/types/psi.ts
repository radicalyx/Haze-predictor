export type RegionId = 'north' | 'south' | 'east' | 'west' | 'central';

export interface RegionData {
  name: RegionId;
  displayName: string;
  psi: number;
  pm25: number | null;
  change: number;
  category: string;
  color: string;
  hex: string;
  categoryDescription: string;
  pm25Category: string | null;
  pm25Color: string | null;
}

export interface PsiCurrentResponse {
  status: string;
  source: string;
  platform: string;
  datasetUrl: string;
  apiEndpoint: string;
  licenseUrl: string;
  timestamp: string;
  updatedTimestamp: string;
  isStale: boolean;
  staleReason?: string;
  fetchedAt: string;
  fromCache?: boolean;
  regions: Record<RegionId, RegionData>;
  summary: {
    highest: { region: RegionId; displayName: string; psi: number };
    lowest: { region: RegionId; displayName: string; psi: number };
    nationalAverage: number;
    overallCategory: string;
    overallColor: string;
    overallHex: string;
    overallDescription: string;
    changeFromPrevious: number;
  };
  pollutants: {
    pm25_twenty_four_hourly?: Record<string, number>;
    pm10_twenty_four_hourly?: Record<string, number>;
    so2_twenty_four_hourly?: Record<string, number>;
    no2_one_hour_max?: Record<string, number>;
    co_eight_hour_max?: Record<string, number>;
    o3_eight_hour_max?: Record<string, number>;
  };
  weather?: {
    temperature: number | null;
    relativeHumidity: number | null;
    windSpeed: number | null;
  } | null;
}

export interface HistoricalObservation {
  date: string;
  timestamp?: string;
  label?: string;
  national: number;
  north: number;
  south: number;
  east: number;
  west: number;
  central: number;
  max: number;
  min: number;
  isAggregate?: boolean;
  daysCount?: number;
}

export interface HistoricalResponse {
  range: string;
  region: string;
  aggregation: string;
  startDate: string;
  endDate: string;
  totalObservations: number;
  statistics: {
    max: number;
    min: number;
    average: number;
    median: number;
    daysExceeding100: number;
    percentageUnhealthy: number;
    categoryDistribution?: {
      Good: number;
      Moderate: number;
      Unhealthy: number;
      VeryUnhealthy: number;
      Hazardous: number;
    };
  };
  data: HistoricalObservation[];
  missingPeriods: Array<{ from: string; to: string; gapDays: number }>;
}

export interface DailyForecast {
  step: number;
  date: string;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  category: string;
  color: string;
  hex: string;
  confidence: string;
  uncertaintyRange: number;
}

export interface ForecastResponse {
  status: string;
  message?: string;
  region: string;
  horizonDays: number;
  generatedAt: string;
  lastObservationDate: string;
  methodology: {
    name: string;
    type: string;
    seasonality: string;
    intervalMethod: string;
    isOfficialNeaForecast: boolean;
    disclaimer: string;
  };
  validation: {
    mae: number;
    rmse: number;
    baselineMae: number;
    baselineRmse: number;
    coverage80Percent: number;
    evaluatedAgainst: string;
    isOutperformingBaseline: boolean;
  };
  summary: {
    predictedMean: number;
    historicalMean30d: number;
    predictedMax: number;
    predictedMin: number;
    potentialUnhealthyDays: number;
  };
  dailyForecasts: DailyForecast[];
  historicalTail: Array<{
    date: string;
    actual: number;
    isForecast: boolean;
    category: string;
  }>;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded';
  timestamp: string;
  latencyMs: number;
  upstreamDataSource: {
    provider: string;
    portal: string;
    reachable: boolean;
    httpStatus: number | null;
    errorMessage: string | null;
  };
  historicalDatabase: {
    loaded: boolean;
    totalDailyRecords: number;
    coveragePeriod: string;
  };
  forecastingEngine: {
    operational: boolean;
    methodology: string;
    horizonSupportedDays: number;
    errorMessage: string | null;
  };
  environment: {
    nodeVersion: string;
    platform: string;
    runtime: string;
  };
}
