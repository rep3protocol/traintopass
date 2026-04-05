export const PATCHES = {
  first_step: {
    key: "first_step",
    name: "First Step",
    description: "Complete your first AFT assessment",
    emoji: "🎖️",
    color: "#4ade80",
  },
  all_green: {
    key: "all_green",
    name: "All Green",
    description: "Pass all 5 events in a single assessment",
    emoji: "✅",
    color: "#4ade80",
  },
  perfect_soldier: {
    key: "perfect_soldier",
    name: "Perfect Soldier",
    description: "Score 500/500 on the AFT",
    emoji: "⭐",
    color: "#facc15",
  },
  iron_will: {
    key: "iron_will",
    name: "Iron Will",
    description: "Maintain a 30-day activity streak",
    emoji: "🔥",
    color: "#f97316",
  },
  most_improved: {
    key: "most_improved",
    name: "Most Improved",
    description: "Improve your score by 50+ points between assessments",
    emoji: "📈",
    color: "#4ade80",
  },
  full_send: {
    key: "full_send",
    name: "Full Send",
    description: "Complete the full 4-week AFT training plan",
    emoji: "💪",
    color: "#4ade80",
  },
  no_excuses: {
    key: "no_excuses",
    name: "No Excuses",
    description: "Complete the general 8-week training program",
    emoji: "🏋️",
    color: "#4ade80",
  },
  unit_leader: {
    key: "unit_leader",
    name: "Unit Leader",
    description: "Create a unit group",
    emoji: "🎗️",
    color: "#facc15",
  },
  battle_buddy: {
    key: "battle_buddy",
    name: "Battle Buddy",
    description: "Join a unit group",
    emoji: "🤝",
    color: "#4ade80",
  },
  top_of_the_board: {
    key: "top_of_the_board",
    name: "Top of the Board",
    description:
      "Reach #1 on the public leaderboard in your age group and gender",
    emoji: "🏆",
    color: "#facc15",
  },
} as const;

export type PatchKey = keyof typeof PATCHES;

export function isPatchKey(s: string): s is PatchKey {
  return s in PATCHES;
}
