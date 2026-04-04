import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your AFT Results — Train to Pass",
  description:
    "See your Army Fitness Test score breakdown and your personalized 4-week training plan.",
  openGraph: {
    title: "Your AFT Results — Train to Pass",
    description:
      "See your Army Fitness Test score breakdown and your personalized 4-week training plan.",
  },
};

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
