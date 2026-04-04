export type GeneralProgramGoal =
  | "Strength"
  | "Cardio"
  | "Full Military Fitness";

export type GeneralProgramEquipment =
  | "No equipment"
  | "Dumbbells only"
  | "Full gym";

export type GeneralProgramFitnessLevel = "Beginner" | "Intermediate" | "Advanced";

export type GeneralProgramStored = {
  goal: GeneralProgramGoal;
  trainingDays: 3 | 4 | 5 | 6;
  equipment: GeneralProgramEquipment;
  fitnessLevel: GeneralProgramFitnessLevel;
  limitations: string;
  markdown: string;
  generatedAt: string;
};

export function isGeneralProgramStored(x: unknown): x is GeneralProgramStored {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.markdown === "string" &&
    typeof o.generatedAt === "string" &&
    typeof o.goal === "string" &&
    typeof o.equipment === "string" &&
    typeof o.fitnessLevel === "string" &&
    (o.trainingDays === 3 ||
      o.trainingDays === 4 ||
      o.trainingDays === 5 ||
      o.trainingDays === 6) &&
    typeof o.limitations === "string"
  );
}
