import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AFT Leaderboard — Train to Pass",
  description:
    "See the top Army Fitness Test scores by age group and gender on Train to Pass.",
  openGraph: {
    title: "AFT Leaderboard — Train to Pass",
    description:
      "See the top Army Fitness Test scores by age group and gender on Train to Pass.",
  },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
