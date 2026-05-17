export type AnalyticsErrorCode =
  | "INVALID_QUERY"
  | "UNAUTHORIZED"
  | "QUERY_FAILED"
  | "INTERNAL_ERROR";

export type AnalyticsErrorResponse = {
  readonly ok: false;
  readonly code: AnalyticsErrorCode;
  readonly message: string;
};

export type SourceRoiRow = {
  readonly source: string;
  readonly leadCount: number;
  readonly hotLeadCount: number;
  readonly estimatedPipelineValue: number;
  readonly estimatedGci: number;
  readonly conversionRate: number;
};

export type SourceRoiSuccessResponse = {
  readonly ok: true;
  readonly from: string;
  readonly to: string;
  readonly sources: readonly SourceRoiRow[];
};

export type VelocityStageKey =
  | "intake"
  | "qualified"
  | "appointment_scheduled"
  | "live_meeting"
  | "closed";

export type VelocityStageCounts = Record<VelocityStageKey, number>;

export type ConversionVelocitySuccessResponse = {
  readonly ok: true;
  readonly from: string;
  readonly to: string;
  readonly stages: VelocityStageCounts;
  readonly avgDaysToAppointment: number | null;
  readonly avgDaysToAppointmentNote: string | null;
  readonly avgDaysToClose: number | null;
  readonly avgDaysToCloseNote: string;
};
