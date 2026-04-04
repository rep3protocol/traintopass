import type { AgeGroup, EventKey, EventStatus, Gender } from "./aft-scoring";

export type PerEventResult = {
  key: EventKey;
  label: string;
  raw: number;
  score: number;
  passed: boolean;
  status: EventStatus;
};

export type AnalyzeResponseBody = {
  /** Present on new analyses; omitted on older cached results. */
  ageGroup?: AgeGroup;
  gender?: Gender;
  events: PerEventResult[];
  totalScore: number;
  overallPassed: boolean;
  aiPlanFull: string;
  weeks: {
    week1: string;
    week2: string;
    week3: string;
    week4: string;
  };
};

export type AnalyzeRequestBody = {
  ageGroup: AgeGroup;
  gender: Gender;
  scores: Record<EventKey, number>;
};

/** Stored in sessionStorage when analysis API fails; results page shows error UI. */
export type AnalyzeErrorStored = {
  analyzeError: true;
  message?: string;
};

export type ResultsStored = AnalyzeResponseBody | AnalyzeErrorStored;

export function isAnalyzeError(
  data: ResultsStored | null
): data is AnalyzeErrorStored {
  return data != null && "analyzeError" in data && data.analyzeError === true;
}
