export type EnlistmentComponent =
  | "Active Duty"
  | "Army Reserve"
  | "National Guard";

export type EnlistmentStored = {
  branch: string;
  component: EnlistmentComponent;
  targetDate: string | null;
  age: number;
  gender: "male" | "female";
  currentPushups: number;
  currentRunMinutes: number;
  currentRunSeconds: number;
  limitations: string;
  markdown?: string;
  phase1?: string;
  phase2?: string;
  phase3?: string;
  generatedAt?: string;
  /** Highest week marked complete (1–12), optional */
  maxWeekCompleted?: number;
};

export function isEnlistmentStored(v: unknown): v is EnlistmentStored {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.branch === "string" &&
    typeof o.component === "string" &&
    (o.targetDate === null || typeof o.targetDate === "string") &&
    typeof o.age === "number" &&
    (o.gender === "male" || o.gender === "female") &&
    typeof o.currentPushups === "number" &&
    typeof o.currentRunMinutes === "number" &&
    typeof o.currentRunSeconds === "number" &&
    typeof o.limitations === "string"
  );
}
